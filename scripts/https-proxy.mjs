// 零依赖 HTTPS 反代：把局域网的 https 请求转发到本地 next start（http）。
// 目的：手机用 https 访问 → 安全上下文（定位可用）+ 生产构建（无 HMR，不白屏）。
//
// 用法：
//   1. npm run build && npm run start   （另一个终端，HTTP 跑在 3000）
//   2. node scripts/https-proxy.mjs     （本终端，HTTPS 跑在 3443）
//   3. 手机访问 https://<你的局域网IP>:3443
//
// 证书复用 next --experimental-https 生成的 certificates/ 下文件。
import { createServer } from "node:https";
import { request } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = join(ROOT, "certificates/localhost-key.pem");
const CERT = join(ROOT, "certificates/localhost.pem");

const TARGET_HOST = "127.0.0.1";
const TARGET_PORT = Number(process.env.TARGET_PORT || 3000);
const LISTEN_PORT = Number(process.env.HTTPS_PORT || 3443);

if (!existsSync(KEY) || !existsSync(CERT)) {
  console.error(
    "✗ 找不到证书。先跑一次 `npm run dev:lan:https` 生成 certificates/ 即可（之后可 Ctrl+C）。",
  );
  process.exit(1);
}

const server = createServer(
  { key: readFileSync(KEY), cert: readFileSync(CERT) },
  (req, res) => {
    // 原样转发方法 / 路径 / 头到本地 next start
    const proxied = request(
      {
        host: TARGET_HOST,
        port: TARGET_PORT,
        method: req.method,
        path: req.url,
        headers: { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode || 502, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxied.on("error", (err) => {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end(
        "代理上游失败：请确认另一个终端已 `npm run start`（HTTP:" +
          TARGET_PORT +
          "）。\n" +
          err.message,
      );
    });
    req.pipe(proxied);
  },
);

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`✅ HTTPS 代理已启动`);
  console.log(`   转发 https://0.0.0.0:${LISTEN_PORT} → http://${TARGET_HOST}:${TARGET_PORT}`);
  console.log(`   手机访问 https://<你的局域网IP>:${LISTEN_PORT}`);
});
