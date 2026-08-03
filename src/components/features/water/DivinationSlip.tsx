"use client";

/**
 * 签纸层（核心视觉主体）
 * ─────────────────────────────────────────────
 * 一张长条白色宣纸卡：边缘用 SVG feTurbulence 蒙版做出毛糙手撕感。
 * 落水动画（aloft→alighted）由 slipVariants 驱动，阻尼来自 dropSpring；
 * 落定瞬间 onAnimationComplete 上报状态机推进 splash。
 * 签面内容（emoji/菜名/文案）在 contentVisible 时由 developVariants 洇湿显影。
 *
 * 阴影随相位变化：空中强阴影（悬浮感）→ 入水后阴影消散（沉入水里）。
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { slipVariants, developVariants } from "@/lib/water-motion";
import type { WaterPhase } from "@/hooks/useWaterDivination";

type Reveal = {
  emoji: string;
  name: string;
  /** 温柔朋友文案 */
  verse: string;
  /** 吉位（大吉/中吉…），可选 */
  grade?: string;
};

type DivinationSlipProps = {
  phase: WaterPhase;
  contentVisible: boolean;
  reveal: Reveal;
  /** 落水动画结束回调 */
  onAlighted: () => void;
};

/** 入水后阴影消散（沉入水里），空中/idle 时强阴影聚拢（悬浮感） */
function shadowFor(phase: WaterPhase): string {
  const inWater =
    phase === "splash" ||
    phase === "revealing" ||
    phase === "revealed" ||
    phase === "exploring";
  return inWater
    ? "0 12px 40px rgba(20,50,40,0.06)" // 沉入水：水下轻量发散
    : "0 16px 44px rgba(20,50,40,0.10)"; // 悬空：略聚拢
}

export default function DivinationSlip({
  phase,
  contentVisible,
  reveal,
  onAlighted,
}: DivinationSlipProps) {
  // 落定时的随机微歪角（2~4°，正负随机）。在 idle 阶段先定好，
  // 避免坠落途中变更导致动画重启。SSR 用固定值防水合不一致。
  const [restAngle, setRestAngle] = useState(-3);
  useEffect(() => {
    if (phase === "idle") {
      const mag = 2 + Math.random() * 2; // 2~4
      setRestAngle(Math.random() < 0.5 ? -mag : mag);
    }
  }, [phase]);

  // idle 浮空中呼吸；cast 起进入坠落（fall 在 splash/reveal 后保持，不复位）
  const animate = phase === "idle" ? "hover" : "fall";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <motion.div
        className="relative"
        style={{
          width: 178,
          willChange: "transform, opacity",
          // 白玉水光边：clip-path 会吃掉 border，改用双层 drop-shadow 勾出
          // 跟随毛边轮廓的清透白边高光（等效 border 1px rgba(255,255,255,0.7)）。
          filter:
            "drop-shadow(0 0 0.6px rgba(255,255,255,0.85)) drop-shadow(0 0 2px rgba(255,255,255,0.7))",
        }}
        variants={slipVariants}
        custom={restAngle}
        initial="aloft"
        animate={animate}
        onAnimationComplete={(def) => {
          // 坠落动画收尾时兜底推进（contact 计时器通常已先推进，幂等）
          if (def === "fall" && phase === "casting") onAlighted();
        }}
      >
        {/* 白玉宣纸：半透明奶白玉 + 毛玻璃。idle 时略透(0.82)降侵略性，显影后转近实(0.96)
            —— 纸够实，字才像「写在纸上」而非浮在半透明玻璃前。
            pointer-events-auto：点到纸上由它吞掉，不冒涟漪（涟漪只在裸露水面起）。 */}
        <motion.div
          className="pointer-events-auto relative overflow-hidden rounded-[8px]"
          style={{
            minHeight: 384,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            // 材质从诞生起锁定干净白，绝不留给浏览器默认的透明黑当插值起点
            // （否则首帧会从 rgba(0,0,0,0) 插值到白，闪出半透明灰黑）。
            backgroundColor: "rgba(255, 255, 255, 0.82)",
            // 手工宣纸毛边（Deckle Edge）：更平缓、更不规则的撕裂轮廓，去机械锯齿
            clipPath:
              "polygon(0% 3.2%, 9% 1.1%, 23% 2.4%, 41% 0.6%, 57% 2.1%, 73% 0.9%, 88% 2.6%, 100% 1.4%, 98.6% 28%, 99.6% 55%, 98.8% 80%, 100% 97%, 87% 99.3%, 71% 97.6%, 54% 99.5%, 38% 97.8%, 22% 99.4%, 8% 97.9%, 0.6% 99.2%, 1.2% 72%, 0.3% 44%, 1% 20%)",
          }}
          initial={{
            backgroundColor: "rgba(255, 255, 255, 0.82)",
            boxShadow: shadowFor("idle"),
          }}
          animate={{
            boxShadow: shadowFor(phase),
            backgroundColor: contentVisible
              ? "rgba(255, 255, 255, 0.96)"
              : "rgba(255, 255, 255, 0.82)",
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >

          {/* 手工造纸纤维粗粝感：极淡的不规则斑驳（无方向、无横线） */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 22% 18%, rgba(160,150,130,0.05), transparent 9%), radial-gradient(circle at 68% 42%, rgba(160,150,130,0.045), transparent 11%), radial-gradient(circle at 38% 74%, rgba(160,150,130,0.05), transparent 10%), radial-gradient(circle at 82% 86%, rgba(160,150,130,0.04), transparent 12%), linear-gradient(180deg, transparent 82%, rgba(150,165,158,0.07) 100%)",
            }}
          />

          {/* 签面内容：显影。加大留白与字距，呈现冥想软件般的克制呼吸感 */}
          <motion.div
            className="relative flex flex-col items-center px-5 pb-11 pt-10 text-center"
            variants={developVariants}
            initial="hidden"
            animate={contentVisible ? "shown" : "hidden"}
            style={{ willChange: "opacity, filter, transform" }}
          >
            {/* 顶部「签」朱砂印 */}
            <span
              className="mb-7 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium"
              style={{ border: "1px solid #991b1b", color: "#991b1b" }}
            >
              签
            </span>

            {reveal.grade && (
              <div className="mb-5">
                <span
                  className="text-2xl font-semibold"
                  style={{ color: "#991b1b", letterSpacing: "0.22em" }}
                >
                  {reveal.grade}
                </span>
              </div>
            )}

            <div className="my-2 text-5xl">{reveal.emoji}</div>

            <div
              className="mt-5 max-w-full break-words text-2xl font-semibold leading-snug text-ink"
              style={{ letterSpacing: "0.08em" }}
            >
              {reveal.name}
            </div>

            <div className="mx-auto my-6 h-px w-8 bg-ink/15" />

            <p
              className="px-3 text-xs text-ink-muted"
              style={{ lineHeight: 2, letterSpacing: "0.1em" }}
            >
              {reveal.verse}
            </p>
          </motion.div>
        </motion.div>

        {/* 朱砂印「定」：revealed 时落下 */}
        <motion.div
          className="absolute -right-1.5 bottom-12 flex h-11 w-11 items-center justify-center rounded-lg text-xl font-semibold text-white/95"
          style={{
            background: "#991b1b",
            boxShadow: "0 6px 16px rgba(153,27,27,0.4)",
            willChange: "transform, opacity",
          }}
          initial={{ scale: 0, rotate: 8, opacity: 0 }}
          animate={
            phase === "revealed" || phase === "exploring"
              ? { scale: 1, rotate: -12, opacity: 1 }
              : { scale: 0, rotate: 8, opacity: 0 }
          }
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        >
          定
        </motion.div>
      </motion.div>
    </div>
  );
}
