"use client";

/**
 * PickerForeground / 前景层（z-[5]，夹在场景层 z-0 与内容层 z-10 之间）
 * ─────────────────────────────────────────────
 * 前景元素可与标题/盘子视觉交叠，但永远压不住文字（内容层 z-10 在其之上）。
 * 结构同 PickerScene：per-meal map 选层 + AnimatePresence crossfade（0.8s，复用同款节奏）。
 *
 * 硬约束：aria-hidden、pointer-events-none；动画只 transform/opacity；reduced-motion 瞬切。
 * 各幕前景件：breakfast = StallForeground（近景大摊位）、tea = TreeCanopy（近景树冠）；
 * lunch / dinner / midnight 暂无前景件（返回 null，结构就位方便后加）。
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MealType } from "@/types/food";
import { mealScene, type SceneKey } from "../picker-meal-scenes";
import { StallForeground, TreeCanopy } from "./foreground-parts";

/** 前景选层 map（SceneKey → 前景组件 | null），不写 if 链。 */
const FOREGROUND: Record<SceneKey, (() => JSX.Element) | null> = {
  breakfast: StallForeground,
  lunch: null,
  tea: TreeCanopy,
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
