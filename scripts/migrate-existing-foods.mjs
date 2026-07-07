// @ts-nocheck
/**
 * migrate-existing-foods.mjs —— 给 foods.ts 现有 192 条回填 Phase 1 新增 6 字段。
 *   satiety / indulgence / convenience / occasion / pickLayer / search
 *
 * 用法：
 *   node scripts/migrate-existing-foods.mjs           # 干跑：只推断 + 写报告，不改源
 *   node scripts/migrate-existing-foods.mjs --write    # 确认后真正写回 foods.ts
 *
 * 关键口径（对齐 user S3 收紧点 3）：
 *   - concrete dish（entityType==="dish" && kind==="main"）：satiety 据 role/name 推，pickLayer 随 satiety。
 *   - drink：强制 satiety=1、pickLayer="side"（§1.3）。
 *   - brand/dining_style/dish_group：强制 pickLayer="side"（绝不进 meal 语义），satiety 据实推；
 *     其 pickLayer 由 entityType 政策决定，不受 satiety 支配——故 lint 规则4「meal⟺satiety>=3」
 *     须 scope 到 entityType==="dish"（已在报告标注，供 S6 lint）。
 *   - 绝不改动任何现有 id。幂等：已含 satiety 的对象跳过。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FOODS_PATH = join(__dirname, "..", "src", "config", "foods.ts");
const REPORT_PATH = join(__dirname, "migrate-existing-report.txt");
const WRITE = process.argv.includes("--write");
const src = readFileSync(FOODS_PATH, "utf8");

// ---- cuisineKeyword / fallback（复刻 src/config/cuisine.ts，脚本内自洽）----
const CUISINE_KEYWORD = {
  "cn-generic": "家常菜", "cn-dongbei": "东北菜", "cn-chuanyu": "川菜", "cn-hunan": "湘菜",
  "cn-guangdong": "粤菜", "cn-jiangzhe": "江浙菜", "cn-xibei": "西北菜", "cn-yunguigui": "云南菜",
  "cn-beifang": "北方菜", japanese: "日本料理", korean: "韩国料理",
  "western-italian": "意大利菜", "western-american": "美式餐厅", "western-generic": "西餐厅",
  thai: "泰国菜", sea: "东南亚菜", mideast: "中东菜", indian: "印度菜", "exotic-generic": "异国料理",
};
const CUISINE_FB = {
  "cn-generic": ["家常菜", "中餐"], "cn-dongbei": ["东北菜", "家常菜", "中餐"],
  "cn-chuanyu": ["川菜", "家常菜", "中餐"], "cn-hunan": ["湘菜", "家常菜", "中餐"],
  "cn-guangdong": ["粤菜", "家常菜", "中餐"], "cn-jiangzhe": ["江浙菜", "家常菜", "中餐"],
  "cn-xibei": ["西北菜", "家常菜", "中餐"], "cn-yunguigui": ["云南菜", "家常菜", "中餐"],
  "cn-beifang": ["北方菜", "家常菜", "中餐"], japanese: ["日本料理", "日料"], korean: ["韩国料理", "韩式"],
  "western-italian": ["意大利菜", "西餐厅"], "western-american": ["美式餐厅", "西餐厅"],
  "western-generic": ["西餐厅", "西餐"], thai: ["泰国菜", "东南亚菜"], sea: ["东南亚菜", "异国料理"],
  mideast: ["中东菜", "异国料理"], indian: ["印度菜", "异国料理"], "exotic-generic": ["异国料理"],
};

// ---- 字符串感知扫描（复用 enrich 的逻辑）----
const startMarker = "export const foods: Food[] = [";
const startIdx = src.indexOf(startMarker);
if (startIdx === -1) throw new Error("找不到 foods 数组起点");
const arrayOpen = startIdx + startMarker.length - 1;
function topLevelObjects(text, openBracketIdx) {
  const objs = []; let depth = 0, inStr = false, strCh = "", objStart = -1;
  for (let i = openBracketIdx; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (c === "\\") { i++; continue; } if (c === strCh) inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; strCh = c; continue; }
    if (c === "[") { depth++; continue; }
    if (c === "]") { depth--; if (depth === 0) break; continue; }
    if (c === "{") { if (depth === 1) objStart = i; depth++; continue; }
    if (c === "}") { depth--; if (depth === 1 && objStart !== -1) { objs.push([objStart, i + 1]); objStart = -1; } continue; }
  }
  return objs;
}
const objSpans = topLevelObjects(src, arrayOpen);

const field = (b, k) => { const m = b.match(new RegExp(`\\b${k}:\\s*"([^"]*)"`)); return m ? m[1] : null; };
const arrField = (b, k) => { const m = b.match(new RegExp(`\\b${k}:\\s*\\[([^\\]]*)\\]`)); return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : []; };

// ---- 推断规则 ----
const HEARTY_RE = /汉堡|披萨|盖饭|炒饭|拌饭|牛排|烤鸭|扣肉|红烧肉|大盘鸡|焗饭|卤肉饭|肉夹馍|煲仔饭|烤肉|自助|火锅/;
const LIGHT_RE = /粥|汤$|沙拉|凉菜|小菜|豆腐脑|豆花|蛋挞|华夫|蛋糕|曲奇|饼干|布丁|果|串|丸子|点心|小食/;
function inferSatiety(name, kind, entityType, role, tags) {
  if (kind === "drink") return 1;               // §1.3
  if (HEARTY_RE.test(name)) return 4;
  if (LIGHT_RE.test(name)) return 2;
  if (role === "snack") return 2;               // 现有 snack 多为小吃
  if (/面|粉|米线|馄饨|饺|包|馍|卷饼/.test(name)) return 3;
  return entityType === "dish" ? 3 : 4;         // 非 dish（火锅/品牌）默认更顶饱
}
function inferIndulgence(name, priceTier, tags) {
  if (priceTier === "treat") return 4;
  if (tags.includes("健康轻食") || tags.includes("清淡")) return 2;
  if (tags.includes("高热量")) return 4;
  if (tags.includes("解馋")) return 3;
  return 3;
}
function inferConvenience(name, kind, tags, priceTier) {
  if (/麦当劳|肯德基|汉堡王|华莱士|塔斯汀|赛百味|必胜客|星巴克|全家|便利/.test(name)) return "convenience";
  if (kind === "drink") return "convenience";
  if (tags.includes("适合宿舍")) return "dorm";
  if (priceTier === "treat") return "restaurant";
  if (tags.includes("快手") || tags.includes("省钱")) return "takeout";
  return "restaurant";
}
function inferOccasion(name, priceTier, tags, meals) {
  const set = new Set();
  if (tags.includes("续命") || tags.includes("提神") || tags.includes("快手")) set.add("quick");
  if (priceTier === "treat") { set.add("friends"); set.add("date"); }
  if (meals.includes("midnight")) set.add("lateNight");
  if (!set.size) set.add("solo");
  return [...set];
}
// pickLayer：dish 随 satiety；drink 强制 side；brand/dining_style/dish_group 强制 side（政策）
function inferPickLayer(entityType, kind, satiety) {
  if (kind === "drink") return "side";
  if (entityType !== "dish") return "side";
  return satiety >= 3 ? "meal" : "side";
}

const rows = [], todos = [], edits = [];
for (const [s, e] of objSpans) {
  const block = src.slice(s, e);
  const id = field(block, "id");
  const name = field(block, "name");
  if (!id || !name) continue;
  if (/\bsatiety:/.test(block)) continue; // 幂等

  const kind = field(block, "kind") ?? "main";
  const entityType = field(block, "entityType") ?? "dish";
  const role = field(block, "role") ?? "main";
  const cuisine = field(block, "cuisine") ?? "cn-generic";
  const priceTier = field(block, "priceTier") ?? "normal";
  const shopKeyword = field(block, "shopKeyword");
  const tags = arrField(block, "tags");
  const meals = arrField(block, "meals");

  const satiety = inferSatiety(name, kind, entityType, role, tags);
  const indulgence = inferIndulgence(name, priceTier, tags);
  const convenience = inferConvenience(name, kind, tags, priceTier);
  const occasion = inferOccasion(name, priceTier, tags, meals);
  const pickLayer = inferPickLayer(entityType, kind, satiety);
  const gateQuery = shopKeyword ?? CUISINE_KEYWORD[cuisine] ?? "家常菜";
  const fb = CUISINE_FB[cuisine] ?? ["家常菜"];

  // 一致性自检：dish 的 pickLayer 必须与 satiety 同步（非 dish 由政策强制 side，豁免）
  const layerOk = entityType !== "dish" || kind === "drink"
    ? true
    : (pickLayer === "meal") === (satiety >= 3);
  const flag = !layerOk || (entityType === "dish" && kind === "main" && satiety === 3 && !HEARTY_RE.test(name) && !/面|粉|米线|馄饨|饺|包|馍|卷饼/.test(name) && role === "main");
  rows.push({ id, name, entityType, kind, satiety, indulgence, convenience, occasion: occasion.join("+"), pickLayer, gateQuery, flag });
  if (flag) todos.push({ id, name, why: !layerOk ? "layer/satiety 不一致" : "satiety=3 默认值(请人工确认顶饱度)" });

  const indentM = block.match(/\n(\s*)meals:/);
  const indent = indentM ? indentM[1] : "    ";
  const occStr = occasion.map((o) => `"${o}"`).join(", ");
  const fbStr = fb.map((q) => `"${q}"`).join(", ");
  const inject =
    `\n${indent}satiety: ${satiety},` +
    `\n${indent}indulgence: ${indulgence},` +
    `\n${indent}convenience: "${convenience}",` +
    `\n${indent}occasion: [${occStr}],` +
    `\n${indent}pickLayer: "${pickLayer}",` +
    `\n${indent}search: { gateQuery: "${gateQuery}", displayQuery: "${name}", fallbackQueries: [${fbStr}] },`;
  const mealsLineRe = /(\n\s*meals:\s*\[[^\]]*\],)/;
  if (mealsLineRe.test(block)) {
    edits.push([s, e, block.replace(mealsLineRe, `$1${inject}`)]);
  } else {
    throw new Error(`${name} 无 meals 行，无法定位插入点`);
  }
}

if (WRITE) {
  let out = src;
  for (let i = edits.length - 1; i >= 0; i--) {
    const [s, e, nb] = edits[i];
    out = out.slice(0, s) + nb + out.slice(e);
  }
  writeFileSync(FOODS_PATH, out, "utf8");
}

const pad = (s, n) => String(s).padEnd(n, " ");
let report = `迁移 ${rows.length} 条；需人工确认 ${todos.length} 条\n`;
report += `pickLayer 分布: meal ${rows.filter((r) => r.pickLayer === "meal").length} / side ${rows.filter((r) => r.pickLayer === "side").length}\n`;
report += `（drink 与 brand/dining_style/dish_group 一律 side；见脚本头注）\n\n`;
report += rows.map((r) =>
  `${r.flag ? "⚠ " : "  "}${pad(r.name, 16)} ${pad(r.entityType + "/" + r.kind, 18)} sat${r.satiety} ind${r.indulgence} ${pad(r.pickLayer, 5)} ${pad(r.convenience, 12)} [${r.occasion}] gate=${r.gateQuery}`
).join("\n");
if (todos.length) report += `\n\n—— TODO ——\n` + todos.map((t) => `  ${pad(t.name, 16)} ${t.why}`).join("\n");
writeFileSync(REPORT_PATH, report, "utf8");
console.log(`${WRITE ? "✅ 已写回 foods.ts" : "🔍 干跑（未改源）"}：迁移 ${rows.length} 条，TODO ${todos.length}；报告 → ${REPORT_PATH}`);
