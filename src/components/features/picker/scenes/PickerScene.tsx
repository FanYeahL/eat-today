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
 * 值读自 picker-art-meta.ts 的构图档案（S3 起统一管理，换画只改档案）。
 *
 * 硬约束：动画只 transform/opacity 的 CSS keyframes；reduced-motion 全停但静态场景/底图保留；
 * 场景不抢主内容；无 backdrop-filter；底图有渐变兜底（图挂了也不白屏不破相）。
 */

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MealType } from "@/types/food";
import { mealScene, type SceneKey } from "../picker-meal-scenes";
import { artMeta } from "../picker-art-meta";
import SceneBreakfast from "./SceneBreakfast";
import SceneLunch from "./SceneLunch";
import SceneTea from "./SceneTea";
import SceneDinner from "./SceneDinner";
import SceneMidnight from "./SceneMidnight";

/** 底图可视窗口高度（vh）：画压进上 66vh、下沿接住坞上缘（~70vh）——让画的叙事下段
 *  （夜宵碗猫、晚饭人影窗）露在坞之上而非沉坞后。手机上源图纵向铺满无溢出、focusY 空转，
 *  唯有收窗口才能把焦点带顶上来；窗口变矮后 object-cover 从「纵满横裁 31%」变「横满纵裁 4%」，
 *  顺带治横裁和月亮左切。见 [[picker-art-meta]] focalBand 语义。 */
const ART_WINDOW_VH = 66;

/** 场景选层 map（SceneKey → 场景组件 | null），不写 if 链。
 *  V3 起，纯底图接管的时段（如 tea/lunch/midnight）返回 null——底图 + Ken Burns 即完整画面。 */
const SCENE: Record<SceneKey, () => JSX.Element | null> = {
  breakfast: SceneBreakfast,
  lunch: SceneLunch,
  tea: SceneTea,
  dinner: SceneDinner,
  midnight: SceneMidnight,
};

/**
 * 板绘底图（V4）：约定路径 /scenes/{meal}.webp。图不存在或加载失败时 onError 自隐，
 * 露出下方 --sky 渐变兜底——「没有任何图」时页面仍成立（不白屏不破相）。
 * 铺满所属容器（手机 = 66vh 画框窗口；桌面 = 画廊栏满高）：object-cover + object-position
 * 保焦点带。桌面画廊栏宽 = --gallery-w（≈满高竖构图所需宽），object-cover 近乎无裁、无放大糊化，
 * 根治 DEF-1（宽视口底图只剩天空）。
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

/**
 * 桌面氛围出血层（S4，desktop-only）：同 webp、blur(40px)+brightness(0.7) 铺满整页，
 * 承接超宽屏双栏外余白，任何宽高比不穿帮（画廊栏是清晰主图，此层只是模糊底衬）。
 * blur 是作用在 <img> 上的静态 filter，属 desktop 代码路径、不进小程序包（方案 §2.3 允许）。
 * onError 时随主图一起隐（此处独立 state，主图挂了它也别单独亮）。
 */
function AmbienceBlur({ meal }: { meal: MealType }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="absolute inset-0 hidden overflow-hidden lg:block" aria-hidden>
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
    </div>
  );
}

export default function PickerScene({ meal }: { meal: MealType }) {
  const reduce = useReducedMotion();
  const scene = mealScene(meal);
  const Scene = SCENE[scene.scene];
  const meta = artMeta(meal);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* ① 天空渐变兜底：三段 --sky（顶→中→地平线），铺满整个背景层。
          底图加载前 / 失败时的底色，永远在最底层。桌面画廊栏外区域也靠它 + 氛围层兜。 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgb(var(--sky-0)) 0%, rgb(var(--sky-1)) 45%, rgb(var(--sky-2)) 78%, rgb(var(--c-base)) 100%)",
        }}
      />

      {/* ①.5 桌面氛围出血层（lg+）：模糊同图铺满整页，托住画廊栏两侧余白（超宽屏不穿帮）。
          手机 hidden。crossfade 随 meal（放在窗口外，覆盖全页）。 */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`amb-${meal}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.8, ease: "easeInOut" }}
        >
          <AmbienceBlur meal={meal} />
        </motion.div>
      </AnimatePresence>

      {/* ② 画框窗口：底图 + 动效薄层同处此有界窗口。
          手机 = 上 66vh（叙事下段顶到坞上）；桌面 = 左画廊栏满高原比例（--gallery-w 宽）。
          动效 frame-% 坐标相对此窗口。随 meal crossfade 切换。 */}
      <AnimatePresence mode="sync">
        <motion.div
          key={meal}
          className="picker-art-window absolute left-0 top-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.8, ease: "easeInOut" }}
        >
          <SceneBitmap meal={meal} focusY={meta.focusY} />
          {Scene && <Scene />}
        </motion.div>
      </AnimatePresence>

      {/* ③ 衔接带（手机独有）：叠在画下沿之上，从窗口内 ~6vh 处透明起、到窗口底（66vh）淡到
          实色 dockBlend，再实色铺到页底——「画 → 衔接色 → 坞玻璃」无缝过渡，不露天空渐变接缝。
          桌面画廊栏满高无下沿窗口，故 lg: 隐藏（桌面靠氛围层 + 操作台底色兜）。 */}
      <div
        className="meal-transition absolute inset-x-0 bottom-0 lg:hidden"
        style={{
          top: `${ART_WINDOW_VH - 6}vh`,
          background: `linear-gradient(180deg, transparent 0%, ${meta.dockBlend} 6vh, ${meta.dockBlend} 100%)`,
        }}
      />
    </div>
  );
}
