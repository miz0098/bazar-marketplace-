import { readFileSync } from "node:fs";
import { request } from "node:https";
const info = () =>
  JSON.parse(readFileSync(process.env.BAZAR_BROWSER_STATE!, "utf8")) as {
    origin: string;
    cert: string;
    secret: string;
  };
/** Node-only test controller: trusted ephemeral cert, no disabled TLS, no browser token. */
export async function control(action: string) {
  const s = info(),
    body = JSON.stringify({ action });
  return new Promise<Record<string, number | boolean>>((resolve, reject) => {
    const r = request(
      s.origin + "/__control/action",
      {
        method: "POST",
        ca: readFileSync(s.cert),
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          "x-browser-control": s.secret,
        },
        timeout: 10000,
      },
      (res) => {
        let text = "";
        res.on("data", (d) => {
          text += String(d);
          if (text.length > 4096) r.destroy();
        });
        res.on("end", () => {
          if (res.statusCode !== 200) reject(new Error("Controller denied"));
          else resolve(JSON.parse(text));
        });
      },
    );
    r.on("error", reject);
    r.on("timeout", () => r.destroy(new Error("Controller timeout")));
    r.end(body);
  });
}
