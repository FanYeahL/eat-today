"use client";

/**
 * 涟漪层（最底交互层）
 * ─────────────────────────────────────────────
 * 职责单一：① 常驻接收点击 → 在坐标处起一圈微涟漪；② splash 时从水面中心
 * 激起「细雨平湖」多层波纹（纯 CSS keyframes，见 globals.css 的 pond-ripple）。
 *
 * 不持有业务状态——点击涟漪列表由 useWaterDivination 管，本层只渲染 + 报告坐标。
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { tapRippleTransition } from "@/lib/water-motion";
import type { TapRipple } from "@/hooks/useWaterDivination";

type RippleLayerProps = {
  /** 点击涟漪列表 */
  taps: TapRipple[];
  /** 是否正在 splash（上升沿触发一次完整涟漪爆发） */
  splashing: boolean;
  /** 点击时回调坐标（容器内相对坐标） */
  onTap: (x: number, y: number) => void;
  /** 某点击涟漪动画结束 */
  onTapDone: (id: number) => void;
};

/**
 * 细雨平湖：4 圈时差重叠。
 * 每圈最终都扩散到同一最大尺寸（全屏 ~70%，用 70vmin），靠 delay 错开 + 时长
 * 略有差异，做出一圈圈丝线荡漾的层次。dur 落在 2.0~2.4s（粘滞慢扩散）。
 */
const RINGS = [
  { delay: 0, dur: 2.2 },
  { delay: 0.3, dur: 2.4 },
  { delay: 0.62, dur: 2.2 },
  { delay: 0.98, dur: 2.4 },
];

const RIPPLE_MAX = 70; // vmin，最终半径覆盖全屏 ~70%

export default function RippleLayer({
  taps,
  splashing,
  onTap,
  onTapDone,
}: RippleLayerProps) {
  // 上升沿锁存：splashing false→true 记一个唯一 burst id，
  // 涟漪 key 带上它，每次落水都重新挂载播完整一轮，不被相位切换打断。
  const [burst, setBurst] = useState(0);
  const prev = useRef(false);
  useEffect(() => {
    if (splashing && !prev.current) setBurst((b) => b + 1);
    prev.current = splashing;
  }, [splashing]);

  return (
    <div
      className="absolute inset-0 z-10"
      onPointerDown={(e) => {
        // 只有点「水面」才起涟漪：点签纸卡、控件等 PE-auto 元素时，
        // 事件被它们吞掉，根本不冒泡到这层 → 纸上/控件上不起涟漪（符合预期）。
        const rect = e.currentTarget.getBoundingClientRect();
        onTap(e.clientX - rect.left, e.clientY - rect.top);
      }}
    >
      {/* —— 点击微涟漪：点水面起一圈，幅度小、冷翠绿 multiply 才可见。
            压在签纸下（z-10 < 签纸 z-20），所以只在裸露水面看得到，纸上不会冒。 —— */}
      <AnimatePresence>
        {taps.map((t) => (
          <motion.span
            key={t.id}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: t.x,
              top: t.y,
              width: 80,
              height: 80,
              marginLeft: -40,
              marginTop: -40,
              border: "1.5px solid rgba(45, 106, 79, 0.55)",
              mixBlendMode: "multiply",
              willChange: "transform, opacity",
            }}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={tapRippleTransition}
            onAnimationComplete={() => onTapDone(t.id)}
          />
        ))}
      </AnimatePresence>

      {/* —— 细雨平湖涟漪：触水点起，4 圈冷翠绿水痕时差荡漾 ——
          玉石深度冷翠绿 + multiply：在浅色冰川碧上自然加深水流阴影，
          肉眼清晰、极舒适的真水痕（白线在浅底隐形，弃用）。 */}
      {burst > 0 &&
        RINGS.map((ring, i) => (
          <span
            key={`ripple-${burst}-${i}`}
            className="ambience-anim pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: `${RIPPLE_MAX}vmin`,
              height: `${RIPPLE_MAX}vmin`,
              border: "1px solid rgba(45, 106, 79, 0.35)",
              mixBlendMode: "multiply",
              transformOrigin: "center",
              animation: `pond-ripple ${ring.dur}s cubic-bezier(0.1, 0.8, 0.3, 1) ${ring.delay}s both`,
              willChange: "transform, opacity",
            }}
          />
        ))}
    </div>
  );
}
