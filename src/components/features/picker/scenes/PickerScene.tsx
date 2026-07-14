"use client";

/**
 * PickerScene / 饭点「场景舞台」编排器（替代 PickerAtmosphere，/picker 所有 phase 背后渲染一次）
 * ─────────────────────────────────────────────
 * 全屏场景层（z-0，落在 z-10 内容之下）：一层天空渐变（走 data-meal 的 --sky-0/-1/-2 token，
 * 地平线以下过渡到 --c-base 桌面色）+ 当前 meal 的一整幕场景（SCENE map 选层，不写 if 链）。
 * 场景之间用 crossfade 过渡（AnimatePresence key=meal），reduced-motion 下瞬切（duration 0）。
 *
 * 硬约束：动画只 transform/opacity 的 CSS keyframes；reduced-motion 全停但静态场景保留；
 * 场景不抢主内容——但氛围本身是产品体验的一部分（本轮方向：场景即舞台，内容浮其上）。
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MealType } from "@/types/food";
import { mealScene, type SceneKey } from "../picker-meal-scenes";
import SceneBreakfast from "./SceneBreakfast";
import SceneLunch from "./SceneLunch";
import SceneTea from "./SceneTea";
import SceneDinner from "./SceneDinner";
import SceneMidnight from "./SceneMidnight";

/** 场景选层 map（SceneKey → 场景组件），不写 if 链。 */
const SCENE: Record<SceneKey, () => JSX.Element> = {
  breakfast: SceneBreakfast,
  lunch: SceneLunch,
  tea: SceneTea,
  dinner: SceneDinner,
  midnight: SceneMidnight,
};

export default function PickerScene({ meal }: { meal: MealType }) {
  const reduce = useReducedMotion();
  const scene = mealScene(meal);
  const Scene = SCENE[scene.scene];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* 天空渐变：三段 --sky（顶→中→地平线），地平线以下过渡到桌面色 --c-base。
          场景视窗高约 62vh（含天空 + 地平线），下方是桌面区。 */}
      <div
        className="absolute inset-x-0 top-0 h-[62vh]"
        style={{
          background:
            "linear-gradient(180deg, rgb(var(--sky-0)) 0%, rgb(var(--sky-1)) 55%, rgb(var(--sky-2)) 88%, rgb(var(--c-base)) 100%)",
        }}
      />
      {/* 桌面区底色 */}
      <div className="absolute inset-x-0 bottom-0 top-[62vh] bg-base" />

      {/* 当前 meal 的一整幕场景，crossfade 切换 */}
      <AnimatePresence mode="sync">
        <motion.div
          key={meal}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.8, ease: "easeInOut" }}
        >
          <Scene />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
