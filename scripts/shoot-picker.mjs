// /picker 验收截图工具链（V4 S7）
// ─────────────────────────────────────────────
// 一条命令跑完整验收矩阵，内置「强制清端口 + 可选清 .next」防陈旧 server 事故
// （复盘：旧 dev server 占端口 + 旧 .next 构建会让截图渲染的是已退役的旧场景）。
//
// 矩阵（方案 §8.1）：5 时段 × { 390×844@2x, 390×667@2x, 1440×900@1x } × { 常规, reduced-motion }
//   = 30 张，外加 dinner 切入后 1s「早帧」× 3 视口（抓 delay 窗口内的裸露动效）。
// 产物：/tmp/picker-verify/{normal|rm}-{viewport}-{meal}.png + early-{viewport}-dinner.png
//
// 用法：
//   node scripts/shoot-picker.mjs            # 用现有 .next standalone 构建（没有则自动 build）
//   node scripts/shoot-picker.mjs --clean    # 先 rm -rf .next 再 build（根治缓存类事故）
//   node scripts/shoot-picker.mjs --build     # 强制重新 build（不删 .next）
//   PORT=3200 node scripts/shoot-picker.mjs  # 换端口
//
// 依赖：headless Chrome（走 CDP，用 Node 全局 WebSocket，无需 puppeteer/ws 包）。
import { spawn, spawnSync, execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 3100);
const CDP_PORT = Number(process.env.CDP_PORT || 9222);
const OUT = process.env.OUT_DIR || "/tmp/picker-verify";
const URL = `http://localhost:${PORT}/picker`;
const CHROME =
  process.env.CHROME_BIN ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = new Set(process.argv.slice(2));
const DO_CLEAN = args.has("--clean");
const DO_BUILD = args.has("--build") || DO_CLEAN;

// 时段顺序 = MealTabs 里 role=radio 的 DOM 顺序（breakfast…midnight）。
const MEALS = ["breakfast", "lunch", "tea", "dinner", "midnight"];
// 视口矩阵：手机长/短屏 @2x + 桌面 @1x（桌面是上一轮验收漏掉、DEF-1 的重灾区）。
const VIEWPORTS = [
  { name: "m844", width: 390, height: 844, dsf: 2, mobile: true },
  { name: "m667", width: 390, height: 667, dsf: 2, mobile: true },
  { name: "desk", width: 1440, height: 900, dsf: 1, mobile: false },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 强制清端口：杀掉任何占用目标端口的进程（防陈旧 server 事故）。 */
function killPort(port) {
  try {
    const pids = execSync(`lsof -ti:${port} 2>/dev/null || true`)
      .toString()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {}
    }
    if (pids.length) console.log(`  清端口 ${port}：杀了 ${pids.length} 个进程`);
  } catch {}
}

/** 杀掉遗留的 headless Chrome（同 CDP 端口）。 */
function killChrome(port) {
  try {
    execSync(`pkill -f "remote-debugging-port=${port}" 2>/dev/null || true`);
  } catch {}
}

/** 准备 standalone 构建：可选清 .next → build → 把 static/public 拷进 standalone。 */
function prepareBuild() {
  const standaloneServer = join(ROOT, ".next/standalone/server.js");
  if (DO_CLEAN) {
    console.log("→ --clean：删除 .next");
    rmSync(join(ROOT, ".next"), { recursive: true, force: true });
  }
  if (DO_BUILD || !existsSync(standaloneServer)) {
    console.log("→ 构建生产版（next build）…");
    const r = spawnSync("npx", ["next", "build"], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (r.status !== 0) {
      console.error("✗ build 失败");
      process.exit(1);
    }
  }
  if (!existsSync(standaloneServer)) {
    console.error(
      "✗ 没有 .next/standalone/server.js（next.config 需 output:'standalone'）",
    );
    process.exit(1);
  }
  // standalone 需要静态资源 + public 与 server.js 并置，否则 /scenes/*.webp 与 chunks 404。
  cpSync(join(ROOT, ".next/static"), join(ROOT, ".next/standalone/.next/static"), {
    recursive: true,
    force: true,
  });
  cpSync(join(ROOT, "public"), join(ROOT, ".next/standalone/public"), {
    recursive: true,
    force: true,
  });
  console.log("  standalone 资源就位（static + public/scenes）");
}

/** 拉起 standalone 服务，轮询 /picker 直到 200。 */
async function startServer() {
  const proc = spawn("node", [".next/standalone/server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (let i = 0; i < 60; i++) {
    await sleep(300);
    try {
      const res = await fetch(URL);
      if (res.status === 200) {
        console.log(`  server 就绪 → ${URL}`);
        return proc;
      }
    } catch {}
  }
  proc.kill("SIGKILL");
  throw new Error("server 未在 18s 内就绪");
}

/** 启一个 headless Chrome，返回 CDP 目标的 webSocket 地址。 */
async function launchChrome(profile) {
  killChrome(CDP_PORT);
  await sleep(500);
  const proc = spawn(
    CHROME,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const res = await fetch(`http://localhost:${CDP_PORT}/json`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl)
        return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch {}
  }
  proc.kill("SIGKILL");
  throw new Error("Chrome CDP 未就绪");
}

/** 极简 CDP 客户端（Node 全局 WebSocket）。 */
function cdp(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  });
  return (method, params = {}) =>
    new Promise((resolve) => {
      const myId = ++id;
      pending.set(myId, resolve);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
}

/** 读当前 data-meal + 底图加载态（验收断言用）。 */
async function readState(send) {
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const main = document.querySelector('[data-meal]');
      const img = document.querySelector('img[src*="/scenes/"]');
      return JSON.stringify({
        dataMeal: main ? main.getAttribute('data-meal') : null,
        imgSrc: img ? img.getAttribute('src') : null,
        imgComplete: img ? img.complete : null,
        imgNatural: img ? (img.naturalWidth + 'x' + img.naturalHeight) : null,
      });
    })()`,
    returnByValue: true,
  });
  return r.result.value;
}

async function clickMeal(send, index) {
  await send("Runtime.evaluate", {
    expression: `[...document.querySelectorAll('[role="radio"]')][${index}]?.click()`,
    returnByValue: true,
  });
}

async function shot(send, file) {
  const s = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, file), Buffer.from(s.data, "base64"));
}

/** 单个 {viewport × reduced?} 会话：切五个时段各截一张，dinner 另补早帧。 */
async function runPass(vp, reduced) {
  const tag = reduced ? "rm" : "normal";
  const profile = `/tmp/picker-chrome-${tag}-${vp.name}`;
  const { proc, wsUrl } = await launchChrome(profile);
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => (ws.onopen = r));
  const send = cdp(ws);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.dsf,
    mobile: vp.mobile,
  });
  if (reduced)
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
  await send("Page.navigate", { url: URL });
  await sleep(3500); // hydrate + settle

  const results = [];
  for (let i = 0; i < MEALS.length; i++) {
    const meal = MEALS[i];
    await clickMeal(send, i);
    // dinner（i=3）在常规态多截一张「切入后 1s 早帧」，抓 delay 窗口内裸露动效。
    if (meal === "dinner" && !reduced) {
      await sleep(1000);
      await shot(send, `early-${vp.name}-dinner.png`);
    }
    await sleep(1600); // crossfade + Ken Burns 首帧稳定
    const state = await readState(send);
    results.push(`${meal}: ${state}`);
    await shot(send, `${tag}-${vp.name}-${meal}.png`);
  }
  ws.close();
  proc.kill("SIGKILL");
  console.log(`  [${tag} ${vp.name}]`);
  for (const line of results) console.log(`    ${line}`);
}

async function main() {
  console.log("=== /picker 验收截图 (V4 S7) ===");
  mkdirSync(OUT, { recursive: true });
  // rm 掉旧截图，避免和上轮混淆
  try {
    execSync(`rm -f ${OUT}/*.png`);
  } catch {}

  killPort(PORT);
  prepareBuild();
  const server = await startServer();

  try {
    for (const vp of VIEWPORTS) {
      await runPass(vp, false);
      await runPass(vp, true);
    }
  } finally {
    server.kill("SIGKILL");
    killChrome(CDP_PORT);
    killPort(PORT);
  }

  const n = execSync(`ls ${OUT}/*.png 2>/dev/null | wc -l`).toString().trim();
  console.log(`\n✅ 完成：${n} 张 → ${OUT}`);
  console.log("   矩阵：5 时段 × 3 视口 × {常规,reduced-motion} + dinner 早帧 ×3");
}

main().catch((e) => {
  console.error("✗", e);
  killChrome(CDP_PORT);
  killPort(PORT);
  process.exit(1);
});
