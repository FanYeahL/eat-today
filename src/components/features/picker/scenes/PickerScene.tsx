"use client";

/**
 * PickerScene / 饭点「场景舞台」编排器（/picker 所有 phase 背后渲染一次）
 * ─────────────────────────────────────────────
 * V4 布局重构：场景不再是「全宽 × 62vh + 底部 mask 渐隐」——那让竖构图底图在宽容器里被
 * object-cover 放大到只剩天空（DEF-1），且 mask 吃掉画的叙事下段（DEF-3）。改为：
 *   ① 天空渐变兜底（--sky-0/-1/-2）：图未加载/失败时的底色，永远在最底层，铺满整个 art 区。
 *   ② 板绘底图层：/scenes/{meal}.webp，object-cover + per-meal object-position（focusY，
 *      保住该时段焦点带不被裁）。不再定高 62vh、不再 mask——底图铺满 art 网格区，
 *      下沿由 dock 的实体上缘自然接住（PickerDock），画的下段完整可见。
 *   ③ 当前 meal 的动效薄层（Scene* 组件：breakfast 炊烟 / dinner 星+流星，其余 null）。
 * crossfade 过渡（AnimatePresence key=meal），reduced-motion 下瞬切（duration 0）。
 *
 * focusY：object-position 纵向锚（%）——竖构图在较矮的 art 区里裁切时保住哪一段。
 * 方案 §4.2 初值，S3 会迁进 picker-art-meta.ts 统一管理，这里先内联。
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

/** 场景选层 map（SceneKey → 场景组件 | null），不写 if 链。
 *  V3 起，纯底图接管的时段（如 tea/lunch/midnight）返回 null——底图 + Ken Burns 即完整画面。 */
const SCENE: Record<SceneKey, () => JSX.Element | null> = {
  breakfast: SceneBreakfast,
  lunch: SceneLunch,
  tea: SceneTea,
  dinner: SceneDinner,
  midnight: SceneMidnight,
};

/** per-meal object-position 纵向锚（%）：竖构图在较矮 art 区裁切时保住焦点带。
 *  方案 §4.2 初值（S3 迁 art-meta）：lunch 焦点高（太阳/风筝）→ 靠上；dinner/midnight
 *  焦点低（天际线/汤面猫）→ 但 art 区顶部要留天空给 hero，故取中段偏上的折中值。 */
const FOCUS_Y: Record<SceneKey, number> = {
  breakfast: 35,
  lunch: 20,
  tea: 42,
  dinner: 40,
  midnight: 34,
};

/**
 * 板绘底图（V4）：约定路径 /scenes/{meal}.webp。图不存在或加载失败时 onError 自隐，
 * 露出下方 --sky 渐变兜底——「没有任何图」时页面仍成立（不白屏不破相）。
 * 铺满整个 art 区（inset-0），object-cover + object-position 保焦点带；不再定高/不再 mask。
 * 动态感 Tier 1：图层包裹挂 Ken Burns 呼吸（picker-scene-kenburns）。
 */
function SceneBitmap({ meal, focusY }: { meal: MealType; focusY: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Ken Burns 呼吸包裹：极慢缩放漂移让静态底图「活」；scale 基准 1 起步不露边，
          外层 overflow-hidden 兜住漂移溢出。 */}
      <div className="picker-scene-kenburns h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/scenes/${meal}.webp`}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
          style={{ objectPosition: `center ${focusY}%` }}
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
  const focusY = FOCUS_Y[scene.scene];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* ① 天空渐变兜底：三段 --sky（顶→中→地平线），铺满整个背景层。
          底图加载前 / 失败时的底色，永远在最底层。 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgb(var(--sky-0)) 0%, rgb(var(--sky-1)) 45%, rgb(var(--sky-2)) 78%, rgb(var(--c-base)) 100%)",
        }}
      />

      {/* 当前 meal：底图 ② + 动效薄层 ③，一起 crossfade 切换 */}
      <AnimatePresence mode="sync">
        <motion.div
          key={meal}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.8, ease: "easeInOut" }}
        >
          <SceneBitmap meal={meal} focusY={focusY} />
          {Scene && <Scene />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
