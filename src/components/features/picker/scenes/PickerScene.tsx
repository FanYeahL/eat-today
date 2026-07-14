"use client";

/**
 * PickerScene / 饭点「场景舞台」编排器（替代 PickerAtmosphere，/picker 所有 phase 背后渲染一次）
 * ─────────────────────────────────────────────
 * 全屏场景层（z-0，落在 z-10 内容之下）：三层叠放——
 *   ① 天空渐变兜底（走 data-meal 的 --sky-0/-1/-2 token）：图未加载/加载失败时的底色，永远在。
 *   ② 板绘底图层（新，V3）：/scenes/{meal}.webp，object-cover object-top，底部 25% mask 渐隐；
 *      图缺失或加载失败时 onError 自动隐藏，回落到 ① 的渐变——无图时页面与旧版零差异。
 *   ③ 当前 meal 的一整幕 SVG 场景（SCENE map 选层）+ 动效薄层，叠在底图之上。
 * 场景之间用 crossfade 过渡（AnimatePresence key=meal），reduced-motion 下瞬切（duration 0）。
 *
 * 硬约束：动画只 transform/opacity 的 CSS keyframes；reduced-motion 全停但静态场景/底图保留；
 * 场景不抢主内容；无 backdrop-filter；底图有渐变兜底（图挂了也不白屏不破相）。
 */

import { useState } from "react";
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

/**
 * 板绘底图（V3）：约定路径 /scenes/{meal}.webp。图不存在或加载失败时 onError 自隐，
 * 露出下方 --sky 渐变兜底——所以「没有任何图」时页面与旧版完全一致。
 * 底部 25% 用 mask 渐隐到桌面色，筛选卡/CTA 区永远干净。每 meal 随 crossfade 重挂（key）。
 * 动态感 Tier 1：图层包裹挂 Ken Burns 呼吸（picker-scene-kenburns），mask 在外层不参与动画。
 */
function SceneBitmap({ meal }: { meal: MealType }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div
      className="absolute inset-x-0 top-0 h-[62vh] overflow-hidden"
      style={{
        maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
      }}
    >
      {/* Ken Burns 呼吸包裹：极慢缩放漂移让静态底图「活」；scale 基准 1 起步不露边，
          外层 overflow-hidden 兜住漂移溢出。 */}
      <div className="picker-scene-kenburns h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/scenes/${meal}.webp`}
          alt=""
          aria-hidden
          className="h-full w-full object-cover object-top"
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  );
}

export default function PickerScene({ meal }: { meal: MealType }) {
  const reduce = useReducedMotion();
  const scene = mealScene(meal);
  const Scene = SCENE[scene.scene];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* ① 天空渐变兜底：三段 --sky（顶→中→地平线），地平线以下过渡到桌面色 --c-base。
          底图加载前 / 失败时的底色，永远在最底层。场景视窗高约 62vh（含天空 + 地平线）。 */}
      <div
        className="absolute inset-x-0 top-0 h-[62vh]"
        style={{
          background:
            "linear-gradient(180deg, rgb(var(--sky-0)) 0%, rgb(var(--sky-1)) 55%, rgb(var(--sky-2)) 88%, rgb(var(--c-base)) 100%)",
        }}
      />
      {/* 桌面区底色 */}
      <div className="absolute inset-x-0 bottom-0 top-[62vh] bg-base" />

      {/* 当前 meal：底图 ② + SVG 场景 ③，一起 crossfade 切换 */}
      <AnimatePresence mode="sync">
        <motion.div
          key={meal}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.8, ease: "easeInOut" }}
        >
          <SceneBitmap meal={meal} />
          <Scene />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
