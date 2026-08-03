// 一键：生产服务 + HTTPS 代理（局域网手机可用、含定位）。
// 假定已 `npm run build`。本脚本拉起 `next start`（HTTP:3000），
// 就绪后启动 HTTPS 反代（:3443），并打印手机可用的局域网地址。
//
// 用法：npm run serve:lan   （= next build && node scripts/serve-lan.mjs）
import { spawn } from "node:child_process";
import { createServer } from "node:https";
import { request } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureCert, lanIP } from "./ensure-cert.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = join(ROOT, "certificates/localhost-key.pem");
const CERT = join(ROOT, "certificates/localhost.pem");
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;

// 证书 SAN 必须含当前局域网 IP，否则 iOS 会硬拒（错误 -1202）。
// IP 漂移时自动重签，避免「换了 WiFi 就连不上」。
ensureCert();

if (!existsSync(KEY) || !existsSync(CERT)) {
  console.error(
    "✗ 缺证书。先跑一次 `npm run dev:lan:https` 生成 certificates/（输一次密码后可 Ctrl+C），再用本命令。",
  );
  process.exit(1);
}

// 1. 拉起生产服务
const next = spawn("npx", ["next", "start", "-p", String(HTTP_PORT)], {
  cwd: ROOT,
  stdio: ["ignore", "pipe", "inherit"],
});

let started = false;
next.stdout.on("data", (buf) => {
  const s = buf.toString();
  process.stdout.write(s);
  if (!started && /Ready|started server|Local:/.test(s)) {
    started = true;
    startProxy();
  }
});
next.on("exit", (code) => {
  console.log(`next start 退出 (code ${code})`);
  process.exit(code ?? 0);
});

// 2. next 就绪后启动 HTTPS 代理
function startProxy() {
  const server = createServer(
    { key: readFileSync(KEY), cert: readFileSync(CERT) },
    (req, res) => {
      const up = request(
        {
          host: "127.0.0.1",
          port: HTTP_PORT,
          method: req.method,
          path: req.url,
          headers: { ...req.headers, host: `127.0.0.1:${HTTP_PORT}` },
        },
        (u) => {
          res.writeHead(u.statusCode || 502, u.headers);
          u.pipe(res);
        },
      );
      up.on("error", (err) => {
        res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
        res.end("上游失败：" + err.message);
      });
      req.pipe(up);
    },
  );
  server.listen(HTTPS_PORT, "0.0.0.0", () => {
    const ip = lanIP() ?? "localhost";
    console.log("\n========================================");
    console.log("✅ 局域网可访问（手机连同一 WiFi）：");
    console.log(`   https://${ip}:${HTTPS_PORT}`);
    console.log("   首次进会提示证书不安全 → 高级 → 继续访问");
    console.log("   Ctrl+C 退出");
    console.log("========================================\n");
  });
}

// 3. Ctrl+C 时连子进程一起收
function shutdown() {
  next.kill("SIGTERM");
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
