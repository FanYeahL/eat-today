// 确保 certificates/ 下的证书 SAN 含当前局域网 IP；不含就用 mkcert 重签。
// LAN IP 会变（换 WiFi/重连），这段保证手机端 HTTPS 主机名校验不会因 IP 漂移而失败。
// 既可独立跑（node scripts/ensure-cert.mjs），也被 serve-lan.mjs 在起服务前调用。
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = join(ROOT, "certificates/localhost-key.pem");
const CERT = join(ROOT, "certificates/localhost.pem");
const BASE_NAMES = ["localhost", "127.0.0.1", "::1", "0.0.0.0"];

/** 取第一个非回环 IPv4，给手机用 */
export function lanIP() {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === "IPv4" && !i.internal) return i.address;
    }
  }
  return null;
}

/** 找到 mkcert 二进制（已缓存于 ~/Library/Caches/mkcert/） */
function findMkcert() {
  const dir = join(
    process.env.HOME || "",
    "Library/Caches/mkcert",
  );
  if (!existsSync(dir)) return null;
  const bin = readdirSync(dir).find((f) => f.startsWith("mkcert-"));
  return bin ? join(dir, bin) : null;
}

/** 读取证书 SAN 文本（用 openssl，macOS 自带） */
function certSAN() {
  try {
    return execFileSync(
      "openssl",
      ["x509", "-in", CERT, "-noout", "-ext", "subjectAltName"],
      { encoding: "utf8" },
    );
  } catch {
    return "";
  }
}

/** 必要时重签。返回 { ip, resigned }。 */
export function ensureCert({ verbose = true } = {}) {
  const ip = lanIP();
  if (!ip) {
    if (verbose) console.warn("⚠ 未探测到局域网 IP，跳过证书检查。");
    return { ip: null, resigned: false };
  }

  const haveCert = existsSync(KEY) && existsSync(CERT);
  if (haveCert && certSAN().includes(ip)) {
    if (verbose) console.log(`✓ 证书已含当前局域网 IP ${ip}，无需重签。`);
    return { ip, resigned: false };
  }

  const mkcert = findMkcert();
  if (!mkcert) {
    console.error(
      "✗ 找不到 mkcert，无法重签。请先安装 mkcert 或手动跑一次 `npm run dev:lan:https`。",
    );
    return { ip, resigned: false };
  }

  console.log(`↻ 证书缺 IP ${ip}，正在用 mkcert 重签…`);
  execFileSync(
    mkcert,
    [
      "-key-file",
      KEY,
      "-cert-file",
      CERT,
      ...BASE_NAMES,
      ip,
    ],
    { cwd: ROOT, stdio: "inherit" },
  );
  console.log(`✓ 已重签证书，含 ${ip}。`);
  return { ip, resigned: true };
}

// 作为脚本直接执行时跑一次
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureCert();
}
