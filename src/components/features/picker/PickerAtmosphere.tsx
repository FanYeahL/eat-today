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
      {/* 纸底：暖米色径向渐变（MCM warm beige，非浅粉橙） */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 82% -10%, #fbf3e4 0%, #f3e6cd 46%, #ecdbbd 100%)",
        }}
      />
      {/* 纸质颗粒：极淡噪点，给印刷海报的纸感 */}
      <div className="picker-paper-grain absolute inset-0" />

      {/* 右上：retro-blue 肾形大色块（冷色分区，慢漂移） */}
      <div className="picker-shape-drift absolute -right-24 top-6 h-[13rem] w-[22rem] text-info/45">
        <KidneyShape className="h-full w-full" />
      </div>

      {/* 左下：olive 回旋镖（第二冷色分区，反向漂移错峰） */}
      <div
        className="picker-shape-drift absolute -left-16 bottom-28 h-24 w-44 text-olive/35"
        style={{ animationDelay: "-6s", animationDuration: "16s" }}
      >
        <Boomerang className="h-full w-full" />
      </div>

      {/* 左上：mustard 星爆小点缀（暖中间色，静态） */}
      <div className="absolute left-6 top-24 h-16 w-16 text-mustard/55">
        <Starburst className="h-full w-full" />
      </div>

      {/* 中偏右：原子轨道极淡线框（极缓自转，退到最底层） */}
      <div className="picker-shape-spin absolute right-8 top-[42%] h-40 w-40 text-brand-soft/20">
        <AtomicOrbit className="h-full w-full" />
      </div>

      {/* 底部桌面色带：暖色渐变横带，与 CTA 连成一整块行动区 */}
      <div className="picker-table-band absolute inset-x-0 bottom-0 h-52" />
    </div>
  );
}
