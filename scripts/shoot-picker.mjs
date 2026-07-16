// /picker 验收截图工具链（V4 S7）
// ─────────────────────────────────────────────
// 一条命令跑完整验收矩阵，内置「强制清端口 + 可选清 .next」防陈旧 server 事故
// （复盘：旧 dev server 占端口 + 旧 .next 构建会让截图渲染的是已退役的旧场景）。
//
// 矩阵（方案 §8.1）：5 时段 × { 390×844@2x, 390×667@2x, 1440×900@1x } × { 常规, reduced-motion }
//   = 30 张，外加 dinner 切入后 1s「早帧」× 3 视口（抓 delay 窗口内的裸露动效）。
// 产物：/tmp/picker-verify/{normal|rm}-{viewport}-{meal}.png + early-{viewport}-dinner.png
//
// 验收门（任一失败 → 非零退出）：
//   ① 加载态断言：data-meal 对、底图 imgComplete && naturalW>0（堵 404 白图）；
//   ② hero 对比度门（§8.2-6）：h1/tagline 对合成背景最坏像素对比度 ≥4.5:1（裸 CDP + canvas WCAG）。
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
import process from "node:process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 3100);
const CDP_PORT = Number(process.env.CDP_PORT || 9222);
const OUT = process.env.OUT_DIR || "/tmp/picker-verify";
const URL = `http://localhost:${PORT}/picker`;

/** ① CDP 通道用 Node 全局 WebSocket——Node 22 才默认开启；20.x 需 --experimental-websocket。
 *  缺失时给出明确提示 + 复跑命令，而不是让后面 `new WebSocket()` 裸崩成看不懂的 ReferenceError。 */
function assertRuntime() {
  if (typeof WebSocket === "undefined") {
    const argv = process.argv.slice(2).join(" ");
    console.error(
      [
        `✗ 运行时缺少全局 WebSocket（当前 Node ${process.version}）。`,
        `  本脚本走 CDP 需要它——Node ≥22 默认开启；Node 20.x 请加实验旗标复跑：`,
        `    node --experimental-websocket scripts/shoot-picker.mjs ${argv}`.trimEnd(),
        `  或升级到 Node 22+。`,
      ].join("\n"),
    );
    process.exit(1);
  }
}

/** ② 跨平台定位 Chrome/Chromium 可执行文件：优先 CHROME_BIN，否则按平台探测常见路径。 */
function resolveChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const candidates =
    process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
      : [
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          "/snap/bin/chromium",
        ];
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;
  console.error(
    [
      `✗ 未找到 Chrome/Chromium（platform: ${process.platform}）。`,
      `  显式指定：CHROME_BIN=/path/to/chrome node scripts/shoot-picker.mjs`,
      `  探测过：\n    ${candidates.join("\n    ")}`,
    ].join("\n"),
  );
  process.exit(1);
}

const CHROME = resolveChrome();

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

/** 读当前 data-meal + 底图加载态（验收断言用）。返回解析后的对象。 */
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
        naturalW: img ? img.naturalWidth : 0,
      });
    })()`,
    returnByValue: true,
  });
  try {
    return JSON.parse(r.result.value);
  } catch {
    return { dataMeal: null, imgSrc: null, imgComplete: null, imgNatural: null, naturalW: 0 };
  }
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

/** WCAG 相对亮度（sRGB 线性化）：单通道 0–255 → 线性。 */
// 说明见 heroContrast 内联注入的页内脚本；此处仅 Node 侧无需重复。

/**
 * §8.2-6 hero 对比度验收门：量 h1 标题 + tagline p 文字色 对「隐藏文字后的真实合成背景」
 * （scrim + 天空渐变 + 底图）的最坏像素对比度。<4.5:1 视为不达标。
 * 全在裸 CDP 会话里做，无依赖：
 *  1) 取 h1 / tagline 的 rect + color；2) 把两者 visibility:hidden 露出纯背景；
 *  3) Page.captureScreenshot 带 clip 截各自文字区（CSS px；dsf 由 clip.scale 归一）；
 *  4) 截图 base64 塞回页面，new Image().decode() → canvas → getImageData，3px 步进遍历，
 *     按 WCAG 取该区最坏（对文字色对比最低）像素的对比度；5) 恢复 visibility。
 * 返回 { h1, tagline } 两个对比度数值（保留两位）。
 */
async function heroContrast(send, vp) {
  // 1) 量 rect + color，并把文字藏起来（露出背景）。
  const meta = await send("Runtime.evaluate", {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      const p = h1 && h1.parentElement
        ? [...h1.parentElement.querySelectorAll('p')][0] : null;
      const pack = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const c = getComputedStyle(el).color;
        return { x: Math.round(r.left), y: Math.round(r.top),
                 w: Math.round(r.width), h: Math.round(r.height), color: c };
      };
      const out = { h1: pack(h1), tagline: pack(p) };
      // 藏文字：只留背景（scrim + 天空 + 底图）供采样
      if (h1) h1.style.visibility = 'hidden';
      if (p) p.style.visibility = 'hidden';
      return JSON.stringify(out);
    })()`,
    returnByValue: true,
  });
  const rects = JSON.parse(meta.result.value);

  const measure = async (box) => {
    if (!box || box.w < 2 || box.h < 2) return null;
    // 3) 截该区（clip 用 CSS px + scale:1 → 返回 CSS 分辨率图，与 rect 同尺度）
    const cap = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 },
    });
    // 4) 塞回页面解码 + WCAG 最坏对比度
    const r = await send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const dataUrl = 'data:image/png;base64,${cap.data}';
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, cv.width, cv.height);
        const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        // 文字色
        const m = ${JSON.stringify(box.color)}.match(/\\d+(\\.\\d+)?/g).map(Number);
        const Ltext = lum(m[0], m[1], m[2]);
        let worst = Infinity;
        for (let y = 0; y < height; y += 3) {
          for (let x = 0; x < width; x += 3) {
            const i = (y * width + x) * 4;
            const Lbg = lum(data[i], data[i + 1], data[i + 2]);
            const hi = Math.max(Ltext, Lbg), lo = Math.min(Ltext, Lbg);
            const cr = (hi + 0.05) / (lo + 0.05);
            if (cr < worst) worst = cr;
          }
        }
        return Math.round(worst * 100) / 100;
      })()`,
    });
    return r.result.value;
  };

  const h1c = await measure(rects.h1);
  const tagc = await measure(rects.tagline);

  // 5) 恢复 visibility（后续截图/切时段不受影响）
  await send("Runtime.evaluate", {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      const p = h1 && h1.parentElement ? [...h1.parentElement.querySelectorAll('p')][0] : null;
      if (h1) h1.style.visibility = '';
      if (p) p.style.visibility = '';
    })()`,
    returnByValue: true,
  });

  return { h1: h1c, tagline: tagc };
}

/** ③ 加载态断言：底图必须 imgComplete===true 且 naturalWidth>0（404 时 complete 可能为 true 但宽为 0），
 *  且 data-meal 与目标时段一致。返回问题列表（空 = 通过）。 */
function assertState(tag, vpName, meal, st) {
  const problems = [];
  if (st.dataMeal !== meal)
    problems.push(`${tag}/${vpName}/${meal}: data-meal="${st.dataMeal}"（期望 ${meal}）`);
  if (st.imgComplete !== true || !st.naturalW || st.naturalW < 1)
    problems.push(
      `${tag}/${vpName}/${meal}: 底图未加载（complete=${st.imgComplete}, natural=${st.imgNatural}, src=${st.imgSrc}）`,
    );
  return problems;
}

/** 单个 {viewport × reduced?} 会话：切五个时段各截一张，dinner 另补早帧。返回失败列表。 */
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
  const failures = [];
  for (let i = 0; i < MEALS.length; i++) {
    const meal = MEALS[i];
    await clickMeal(send, i);
    // dinner（i=3）在常规态多截一张「切入后 1s 早帧」，抓 delay 窗口内裸露动效。
    if (meal === "dinner" && !reduced) {
      await sleep(1000);
      await shot(send, `early-${vp.name}-dinner.png`);
    }
    await sleep(1600); // crossfade + Ken Burns 首帧稳定
    const st = await readState(send);
    results.push(`${meal}: ${JSON.stringify(st)}`);
    failures.push(...assertState(tag, vp.name, meal, st));
    await shot(send, `${tag}-${vp.name}-${meal}.png`);

    // §8.2-6 hero 对比度门：只在 normal 态量（rm 视觉相同，不重复）。归档截图后做，
    // 因为它会临时藏文字——放最后不影响上面的归档图。
    if (!reduced) {
      const c = await heroContrast(send, vp);
      results.push(`  contrast: h1=${c.h1} tagline=${c.tagline}`);
      if (c.h1 != null && c.h1 < 4.5)
        failures.push(`${tag}/${vp.name}/${meal}: hero h1 对比度 ${c.h1} < 4.5`);
      if (c.tagline != null && c.tagline < 4.5)
        failures.push(`${tag}/${vp.name}/${meal}: hero tagline 对比度 ${c.tagline} < 4.5`);
    }
  }
  ws.close();
  proc.kill("SIGKILL");
  console.log(`  [${tag} ${vp.name}]`);
  for (const line of results) console.log(`    ${line}`);
  return failures;
}

async function main() {
  console.log("=== /picker 验收截图 (V4 S7) ===");
  assertRuntime();
  mkdirSync(OUT, { recursive: true });
  // rm 掉旧截图，避免和上轮混淆
  try {
    execSync(`rm -f ${OUT}/*.png`);
  } catch {}

  killPort(PORT);
  prepareBuild();
  const server = await startServer();

  const failures = [];
  try {
    for (const vp of VIEWPORTS) {
      failures.push(...(await runPass(vp, false)));
      failures.push(...(await runPass(vp, true)));
    }
  } finally {
    server.kill("SIGKILL");
    killChrome(CDP_PORT);
    killPort(PORT);
  }

  const n = execSync(`ls ${OUT}/*.png 2>/dev/null | wc -l`).toString().trim();
  console.log(`\n${failures.length ? "⚠" : "✅"} 完成：${n} 张 → ${OUT}`);
  console.log("   矩阵：5 时段 × 3 视口 × {常规,reduced-motion} + dinner 早帧 ×3");

  // ③ 加载态断言：任一底图未加载 / data-meal 错位 → 非零退出，成为真正的验收门。
  if (failures.length) {
    console.error(`\n✗ 验收门未通过（${failures.length} 项）：`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error("✗", e);
  killChrome(CDP_PORT);
  killPort(PORT);
  process.exit(1);
});
