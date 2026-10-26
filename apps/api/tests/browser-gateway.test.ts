import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { browserOrigin, requireBrowserTest } from "./browser/gateway.js";
test("F15 gateway accepts only an exact loopback HTTPS origin and ordinary processes cannot start it", () => {
  assert.equal(browserOrigin("https://127.0.0.1:3443").hostname, "127.0.0.1");
  for (const origin of [
    "http://127.0.0.1:3443",
    "https://api.bazar.ua",
    "https://localhost:3443",
    "https://user:password@127.0.0.1:3443",
    "https://127.0.0.1:3443/path",
    "https://127.0.0.1:3443/",
  ])
    assert.throws(() => browserOrigin(origin));
  assert.throws(requireBrowserTest, /isolated test/);
  const r = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      "import assert from 'node:assert/strict';await assert.rejects(import('./tests/browser/server.ts'),/isolated test/);",
    ],
    {
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "production",
        BAZAR_BROWSER_INTEGRATION: "1",
      },
      encoding: "utf8",
      timeout: 5000,
    },
  );
  assert.equal(r.status, 0, r.stderr);
});
