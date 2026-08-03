"use client";

/**
 * PickerAmbience / 桌面氛围出血层（V4 S4，desktop-only 全屏底衬）
 * ─────────────────────────────────────────────
 * 同 /scenes/{meal}.webp、blur(40px)+brightness(0.7)，铺满整个 <main>（全屏出血，不进 stage 封顶）。
 * 作用：超宽屏（≥2xl）双栏 stage 封顶居中后，两侧余白由此层托住——任何宽高比不穿帮
 * （画廊栏是清晰主图，此层只是模糊底衬）。< lg 时 display:none（不显示；注意 <img> 仍在 DOM、
 * 浏览器仍会下载该 URL——但与画廊主图同 URL，走缓存，实际零额外网络开销）。
 *
 * blur 是作用在 <img> 的静态 filter，属 desktop 代码路径、不进小程序包（方案 §2.3 允许）。
 * crossfade 随 meal（0.8s，与场景同拍）；reduced-motion 下瞬切。onError 自隐（图挂了不亮）。
 */

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MealType } from "@/types/food";

function AmbienceImg({ meal }: { meal: MealType }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/scenes/${meal}.webp`}
        alt=""
        aria-hidden
        className="h-full w-full scale-110 object-cover"
        style={{ filter: "blur(40px) brightness(0.7)" }}
        loading="eager"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </>
  );
}

export default function PickerAmbience({ meal }: { meal: MealType }) {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden lg:block"
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={meal}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.8, ease: "easeInOut" }}
        >
          <AmbienceImg meal={meal} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
