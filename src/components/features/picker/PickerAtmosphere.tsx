/**
 * PickerAtmosphere / 复古菜单海报的背景氛围层（仅 /picker CHOOSE 屏）
 * ─────────────────────────────────────────────
 * 翻译自 AtomicHearth 的 poster 背景构图：warm beige 纸底 + 有机几何分区
 * （KidneyShape / Starburst / AtomicOrbit / Boomerang），不是整屏浅粉橙。
 * 冷暖有节奏：retro-blue 肾形 + olive 回旋镖做冷色分区，橙/mustard 做暖锚点。
 *
 * 动效：2 个有机形慢速漂移（14s）+ 1 个原子轨道极缓自转（22s），全部 transform、
 * 低频、reduced-motion 降级（见 globals.css .picker-shape-drift / -spin）。
 * 全 aria-hidden、绝对定位、z-0，落在内容之下。
 */

import { Starburst, KidneyShape, Boomerang, AtomicOrbit } from "./PickerShapes";

export default function PickerAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* 纸底：暖米色径向渐变（MCM warm beige，非浅粉橙）——全幅铺底 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 82% -10%, #fbf3e4 0%, #f3e6cd 46%, #ecdbbd 100%)",
        }}
      />
      {/* 纸质颗粒：极淡噪点，给印刷海报的纸感——全幅 */}
      <div className="picker-paper-grain absolute inset-0" />
      {/* 底部桌面色带：暖色渐变横带，与 CTA 连成一整块行动区——全幅 */}
      <div className="picker-table-band absolute inset-x-0 bottom-0 h-52" />

      {/* 有机几何形：锚定到「主内容 max-w-md」这条中央带（相对居中的定位框），
          而非视口最左右——保证桌面上装饰围绕面板、手机上也贴着核心区可见。
          形状用负偏移贴在面板左右缘外一点，随内容居中而居中。 */}
      <div className="absolute inset-y-0 left-1/2 w-full max-w-md -translate-x-1/2">
        {/* 右上（贴面板右缘外）：retro-blue 肾形冷色块，慢漂移 */}
        <div className="picker-shape-drift absolute -right-16 top-4 h-[11rem] w-[16rem] text-info/45">
          <KidneyShape className="h-full w-full" />
        </div>

        {/* 左下（贴面板左缘外）：olive 回旋镖，反向漂移错峰 */}
        <div
          className="picker-shape-drift absolute -left-10 bottom-40 h-20 w-36 text-olive/38"
          style={{ animationDelay: "-6s", animationDuration: "16s" }}
        >
          <Boomerang className="h-full w-full" />
        </div>

        {/* 左上（贴面板左缘）：mustard 星爆小点缀（静态） */}
        <div className="absolute -left-3 top-28 h-14 w-14 text-mustard/60">
          <Starburst className="h-full w-full" />
        </div>

        {/* 右中（贴面板右缘外）：原子轨道极淡线框，极缓自转 */}
        <div className="picker-shape-spin absolute -right-8 top-[46%] h-32 w-32 text-brand-soft/22">
          <AtomicOrbit className="h-full w-full" />
        </div>
      </div>

      {/*
       * 桌面补背景（仅 ≥768px）：面板两侧宽屏留白太空（像空网页）时，在面板左右外侧
       * 加更明显的 MCM 分区色块 + 几何，把宽屏填满、又不改中央单列面板。
       * 定位挂在同一条居中带上，用大负偏移推到面板外侧；hidden md:block 手机不出现。
       */}
      <div className="hidden md:block">
        {/* 左侧外场：olive 大肾形分区 + retro-blue 圆 + 星爆，慢漂移 */}
        <div className="absolute left-[8%] top-[14%] h-[22rem] w-[26rem] text-olive/22 picker-shape-drift" style={{ animationDuration: "18s" }}>
          <KidneyShape className="h-full w-full" />
        </div>
        <div className="absolute left-[14%] top-[52%] h-40 w-40 rounded-full bg-info/12" />
        <div className="absolute left-[6%] top-[40%] h-24 w-24 text-mustard/40">
          <Starburst className="h-full w-full" />
        </div>
        {/* 右侧外场：retro-blue 大肾形（与左侧 olive 对称）+ mustard 圆 + 原子轨道 + 回旋镖。
            用冷色/芥末给足与暖米底的对比（纯暖色圆贴在暖底上几乎看不见）。 */}
        <div
          className="absolute right-[6%] top-[16%] h-[22rem] w-[26rem] scale-x-[-1] text-info/28 picker-shape-drift"
          style={{ animationDelay: "-8s", animationDuration: "20s" }}
        >
          <KidneyShape className="h-full w-full" />
        </div>
        <div className="absolute right-[12%] top-[52%] h-40 w-40 rounded-full bg-mustard/35" />
        <div className="absolute right-[9%] top-[58%] h-44 w-44 text-olive/30 picker-shape-spin" style={{ animationDuration: "26s" }}>
          <AtomicOrbit className="h-full w-full" />
        </div>
        <div
          className="absolute right-[10%] top-[18%] h-16 w-28 text-accent/40 picker-shape-drift"
          style={{ animationDelay: "-12s", animationDuration: "22s" }}
        >
          <Boomerang className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
