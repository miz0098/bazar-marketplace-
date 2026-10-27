const storefront=process.env.BAZAR_STOREFRONT_INTEGRATION==='1';
import { randomBytes, createHash } from "node:crypto";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  chmodSync,
  createWriteStream,
} from "node:fs";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { get as httpGet } from "node:http";
import { get as httpsGet } from "node:https";
import { once } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
if (process.env.NODE_ENV === "production")
  throw new Error("Browser integration cannot run in a production process");
const root = fileURLToPath(new URL("../../../", import.meta.url)),
  dir = mkdtempSync(path.join(tmpdir(), "bazar-browser-")),
  project = "bazar-f15-" + randomBytes(6).toString("hex"),
  password = randomBytes(32).toString("hex");
const env = { ...process.env, BAZAR_POSTGRES_PASSWORD: password };
for (const k of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete env[k];
if (process.env.GITHUB_ACTIONS === "true")
  process.stdout.write(`::add-mask::${password}\n`);
const args = [
  "--host=unix:///var/run/docker.sock",
  "compose",
  "-p",
  project,
  "-f",
  path.join(root, "infra/postgres/compose.test.yaml"),
];
function docker(extra, capture = false) {
  const r = spawnSync("docker", [...args, ...extra], {
    env,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (r.status !== 0)
    throw new Error("Disposable browser PostgreSQL command failed");
  return r.stdout?.trim();
}
const children = [];
async function port() {
  const s = createServer();
  s.listen(0, "127.0.0.1");
  await once(s, "listening");
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
}
function child(cmd, args, cwd, childEnv, label) {
  const p = spawn(cmd, args, {
    cwd,
    env: childEnv,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = createWriteStream(path.join(dir, label + ".log"));
  p.stdout.pipe(log);
  p.stderr.pipe(log);
  children.push(p);
  return p;
}
async function ready(url, ca, p) {
  for (let i = 0; i < 120; i++) {
    if (p.exitCode !== null)
      throw new Error("Isolated browser service exited during startup");
    const ok = await new Promise((resolve) => {
      const r = (ca ? httpsGet : httpGet)(
        url,
        { ...(ca ? { ca } : {}), timeout: 1000 },
        (s) => {
          s.resume();
          resolve(s.statusCode === 200);
        },
      );
      r.on("error", () => resolve(false));
      r.on("timeout", () => {
        r.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Isolated browser service startup timed out");
}
try {
  const build = spawnSync("npm", ["run", storefront?"storefront:build":"browser:build"], {
    cwd: path.join(root, "apps/storefront"),
    env,
    stdio: "inherit",
  });
  if (build.status !== 0) throw new Error("Isolated Next build failed");
  docker(["up", "-d", "--wait", "--wait-timeout", "60"]);
  const address = docker(["port", "postgres", "5432"], true);
  if (!/^127\.0\.0\.1:\d+$/.test(address))
    throw new Error("PostgreSQL must be loopback only");
  const cert = path.join(dir, "cert.pem"),
    key = path.join(dir, "key.pem");
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      key,
      "-out",
      cert,
      "-days",
      "1",
      "-subj",
      "/CN=127.0.0.1",
      "-addext",
      "subjectAltName=IP:127.0.0.1,DNS:localhost",
    ],
    { stdio: "ignore" },
  );
  chmodSync(key, 0o600);
  const publicKey = execFileSync("openssl", [
    "x509",
    "-in",
    cert,
    "-pubkey",
    "-noout",
  ]);
  const der = execFileSync("openssl", ["pkey", "-pubin", "-outform", "DER"], {
    input: publicKey,
  });
  const spki = createHash("sha256").update(der).digest("base64");
  const uiPort = await port(),
    tlsPort = await port(),
    origin = `https://127.0.0.1:${tlsPort}`,
    state = path.join(dir, "state.json");
  writeFileSync(
    state,
    JSON.stringify({
      origin,
      uiPort,
      cert,
      key,
      spki,
      secret: randomBytes(32).toString("hex"),
    }),
    { mode: 0o600 },
  );
  const common = {
    ...env,
    BAZAR_BROWSER_INTEGRATION: "1",
    BAZAR_BROWSER_STATE: state,
    ...(storefront?{BAZAR_STOREFRONT_INTEGRATION:"1",STOREFRONT_DATA_SOURCE:"storefront-test",BAZAR_API_BASE_URL:origin,NODE_EXTRA_CA_CERTS:cert}:{}),
  };
  const ui = child(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      storefront?"storefront-integration":"browser-integration",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(uiPort),
    ],
    path.join(root, "apps/storefront"),
    { ...common, NODE_ENV: "production" },
    "ui",
  );
  if(!storefront)await ready(`http://127.0.0.1:${uiPort}/catalog`, null, ui);
  const api = child(
    process.execPath,
    ["--import", "tsx", "tests/browser/server.ts"],
    path.join(root, "apps/api"),
    {
      ...common,
      NODE_ENV: "test",
      DATABASE_TEST_URL: `postgresql://bazar_test_owner:${password}@${address}/bazar_f2_test`,
    },
    "api",
  );
  await ready(origin + "/catalog", readFileSync(cert), api);
  const p = spawn(
    process.execPath,
    [
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config",
      storefront?"storefront.config.ts":"browser.config.ts",
      ...process.argv.slice(2),
    ],
    {
      cwd: path.join(root, "tests/e2e"),
      env: { ...common, NODE_ENV: "test" },
      stdio: "inherit",
    },
  );
  const [exit] = await once(p, "exit");
  process.exitCode = exit ?? 1;
} catch {
  process.stderr.write(
    "Isolated browser integration failed; no credentials are printed.\n",
  );
  for (const label of ["ui", "api"]) {
    try {
      const text = readFileSync(path.join(dir, label + ".log"), "utf8");
      process.stderr.write(
        text
          .split("\n")
          .filter((l) => /Error|error:|failed|code:|message:|Cannot/.test(l))
          .slice(-12)
          .join("\n") + "\n",
      );
    } catch {
      process.stderr.write("Service startup log unavailable.\n");
    }
  }
  process.exitCode = 1;
} finally {
  for (const p of children.reverse()) {
    if (p.exitCode === null) {
      try {
        process.kill(-p.pid, "SIGTERM");
      } catch (e) {
        if (e.code !== "ESRCH") process.exitCode = 1;
      }
      await Promise.race([
        once(p, "exit"),
        new Promise((r) => setTimeout(r, 5000)),
      ]);
      if (p.exitCode === null) {
        try {
          process.kill(-p.pid, "SIGKILL");
        } catch (e) {
          if (e.code !== "ESRCH") process.exitCode = 1;
        }
      }
    }
  }
  try {
    docker(["down", "--volumes", "--remove-orphans"]);
  } catch {
    process.stderr.write(
      "Clean up disposable browser PostgreSQL project " + project + "\n",
    );
    process.exitCode = 1;
  }
  rmSync(dir, { recursive: true, force: true });
}
