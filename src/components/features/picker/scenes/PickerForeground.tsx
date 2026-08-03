"use client";

/**
 * PickerForeground / 前景层（z-[5]，夹在场景层 z-0 与内容层 z-10 之间）
 * ─────────────────────────────────────────────
 * 前景元素可与标题/盘子视觉交叠，但永远压不住文字（内容层 z-10 在其之上）。
 * 结构同 PickerScene：per-meal map 选层 + AnimatePresence crossfade（0.8s，复用同款节奏）。
 *
 * V3 起五幕前景件全部退役（breakfast StallForeground / tea TreeCanopy 都会和底图重复——
 * 底图自带摊子/树/光）。此层保留为空结构（map 全 null），未来加前景动效不用重建。
 * 硬约束：aria-hidden、pointer-events-none；动画只 transform/opacity；reduced-motion 瞬切。
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MealType } from "@/types/food";
import { mealScene, type SceneKey } from "../picker-meal-scenes";

/** 前景选层 map（SceneKey → 前景组件 | null），不写 if 链。V3 起全 null（前景件已退役）。 */
const FOREGROUND: Record<SceneKey, (() => JSX.Element) | null> = {
  breakfast: null,
  lunch: null,
  tea: null,
  dinner: null,
  midnight: null,
};

export default function PickerForeground({ meal }: { meal: MealType }) {
  const reduce = useReducedMotion();
  const scene = mealScene(meal);
  const Foreground = FOREGROUND[scene.scene];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    >
      <AnimatePresence mode="sync">
        {Foreground && (
          <motion.div
            key={meal}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.8, ease: "easeInOut" }}
          >
            <Foreground />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
