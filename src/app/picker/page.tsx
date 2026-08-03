/**
 * Universal Food Picker / 全民今日吃啥机（/picker · 视觉实验）
 * ─────────────────────────────────────────────
 * 新主题实验路由：明亮、有食欲、全年龄友好的 organic 换皮，验证 UI 主题是否成立。
 * 复用现有抽取/探店/菜谱/日记逻辑，只重构表现层（见 UniversalFoodPicker）。
 *
 * .picker-theme 容器在此挂上：作用域内覆盖暖色 --c-* token（见 globals.css），
 * 旧 /water-concept 不受影响，方便新旧对照。首页暂不切，旧页保留。
 *
 * 品牌字体（得意黑子集）也在此作用域挂载 —— 只作用于 /picker，不进全局 layout，
 * 旧页不加载。preload:false 保证这条实验路由不给主站抢首屏字体预载带宽；
 * display:swap 先用系统字体顶上、字体到位再换，无白屏无 FOIT。
 * 只有加了 .picker-brand 的元素（品牌标题/菜名/loading 重点词）才吃这个字体，
 * 正文/店铺/按钮/chip 仍走系统字体（见 globals.css --font-brand / .picker-brand）。
 */

import localFont from "next/font/local";
import UniversalFoodPicker from "@/components/features/picker/UniversalFoodPicker";

// 得意黑 Smiley Sans（子集 woff2 ~83KB，SIL OFL 1.1，见 fonts/OFL.txt）。
// 生成/更新：npm run font:brand（新增菜名缺字时重跑）。
const brandFont = localFont({
  src: "../fonts/SmileySans-subset.woff2",
  variable: "--font-brand",
  weight: "400",
  display: "swap",
  preload: false,
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "PingFang SC",
    "HarmonyOS Sans SC",
    "Microsoft YaHei",
    "system-ui",
    "sans-serif",
  ],
});

export default function PickerPage() {
  return (
    <div className={`${brandFont.variable} picker-theme min-h-screen`}>
      <UniversalFoodPicker />
    </div>
  );
}
