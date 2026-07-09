// scripts/audit-ci.mjs
// ─────────────────────────────────────────────
// CI 安全门：跑 `npm audit --json`，按下面规则判定 CI 红/绿——
//
//   1. 任何 critical 漏洞 → 一律红（零容忍）。
//   2. 任何 high 漏洞，若不在 BASELINE 允许清单里 → 红（挡新引入的高危）。
//   3. BASELINE 里的 high、以及 moderate/low → 只打印、不阻断。
//
// 为什么要 BASELINE 而不是直接 `--audit-level=high`：
//   当前剩余的 high/moderate 全部只能靠跨大版本升级消除（Next 16 / eslint-config-next 16），
//   盲升会破坏项目（见 README「依赖安全」）。直接卡 high 会让 CI 长期假红、失去意义；
//   完全不卡又会放过「新引入」的高危。折中：把「已知、已评估、只能等大版本」的具体 GHSA
//   显式登记进 BASELINE（带原因+复核动作），其余 high 一律挡。清单是「明知故放」的白名单，
//   不是「一律忽略」——升级 Next/eslint-config-next 后必须回来删对应条目。
//
// 复核：每次升级 Next / eslint-config-next 大版本后，重新 `npm audit` 并据实增删 BASELINE。
// 用法：node scripts/audit-ci.mjs   （package.json 里 audit:ci）

import { execSync } from "node:child_process";

/**
 * 已知、已评估、当前只能靠跨大版本升级消除的漏洞白名单。
 * key = GHSA id；value = 原因（含所属包、消除所需的大版本、是否生产依赖）。
 * 新增条目必须写清「为什么放它过」，否则等于 CI 假绿。
 */
const BASELINE = {
  // —— Next.js 本体（生产依赖）。全部需升到 Next 16（大版本）才消除；
  //    14.2.35 已是 14.x 最新补丁位，14 线内无更低成本修法。 ——
  "GHSA-h25m-26qc-wcjf": "next high；仅 Next 16 修复（大版本，生产依赖）",
  "GHSA-q4gf-8mx6-v5v3": "next high；仅 Next 16 修复（大版本，生产依赖）",
  "GHSA-8h8q-6873-q5fj": "next high；仅 Next 16 修复（大版本，生产依赖）",
  "GHSA-c4j6-fc7j-m34r": "next high；仅 Next 16 修复（大版本，生产依赖）",
  "GHSA-36qx-fr4f-26g5": "next high；仅 Next 16 修复（大版本，生产依赖）",
  // —— eslint-config-next → @next/eslint-plugin-next → glob（仅 dev/lint 链路）。
  //    需升到 eslint-config-next 16（大版本，须与 Next 大版本同步）才消除。 ——
  "GHSA-5j98-mcp5-4vw2": "glob high；来自 eslint-config-next，仅 v16 修复（大版本，dev 依赖）",
};

function main() {
  let raw;
  try {
    // npm audit 有漏洞时退出码非 0，会让 execSync 抛错；用 try 捕获后照常读 stdout。
    raw = execSync("npm audit --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    raw = e.stdout?.toString() ?? "";
  }
  if (!raw.trim()) {
    console.error("audit:ci 无法获取 npm audit 输出，判为失败（宁可红也不假绿）。");
    process.exit(1);
  }

  const report = JSON.parse(raw);
  const vulns = report.vulnerabilities ?? {};

  const criticals = [];
  const blockedHighs = [];
  const waivedHighs = [];

  for (const [pkg, v] of Object.entries(vulns)) {
    // 收集这个包关联的所有具体 GHSA id（via 里 object 项带 url/source）
    const advisories = (v.via ?? [])
      .filter((x) => typeof x === "object" && x.url)
      .map((x) => ({
        id: (x.url.match(/GHSA-[\w-]+/) ?? [x.source])[0],
        title: x.title,
        severity: x.severity,
      }));

    if (v.severity === "critical") {
      criticals.push({ pkg, advisories });
      continue;
    }
    if (v.severity === "high") {
      // 该包的高危 advisory 只要有一个不在 BASELINE，就算未豁免 → 阻断
      const unlisted = advisories.filter(
        (a) => a.severity === "high" && !BASELINE[a.id],
      );
      if (unlisted.length > 0) blockedHighs.push({ pkg, advisories: unlisted });
      else waivedHighs.push({ pkg, advisories });
    }
  }

  const meta = report.metadata?.vulnerabilities ?? {};
  console.log(
    `npm audit 汇总：critical=${meta.critical ?? 0} high=${meta.high ?? 0} ` +
      `moderate=${meta.moderate ?? 0} low=${meta.low ?? 0}`,
  );

  if (waivedHighs.length > 0) {
    console.log("\n已豁免（BASELINE 登记、仅大版本可消除，不阻断 CI）：");
    for (const { pkg } of waivedHighs) console.log(`  · ${pkg}`);
  }

  const failed = criticals.length > 0 || blockedHighs.length > 0;
  if (criticals.length > 0) {
    console.error("\n❌ 存在 critical 漏洞（零容忍）：");
    for (const { pkg } of criticals) console.error(`  · ${pkg}`);
  }
  if (blockedHighs.length > 0) {
    console.error("\n❌ 存在未登记的 high 漏洞（疑似新引入，请修复或评估后登记 BASELINE）：");
    for (const { pkg, advisories } of blockedHighs) {
      for (const a of advisories) console.error(`  · ${pkg} — ${a.id} ${a.title}`);
    }
  }

  if (failed) {
    console.error("\naudit:ci 未通过。");
    process.exit(1);
  }
  console.log("\n✅ audit:ci 通过：无 critical、无未登记 high。");
}

main();
