/**
 * picker-art-meta / 五时段底图「构图档案」（V4 机制核心，方案 §4.2）
 * ─────────────────────────────────────────────
 * 每张 /scenes/{meal}.webp 一份声明式档案：UI 与动效薄层全部按档案对位，换画只改这里的数据、
 * 不动组件。彻底取代散落在 Scene*.tsx 里的 `top: 40vh` 这类「画一挪就错位」的硬坐标。
 *
 * 坐标系约定：所有百分比都相对「画框」= 场景层容器（PickerScene 的 absolute inset-0，
 * 与底图同容器）。动效锚点走对齐容忍——只锚大概区域，不锚画中某个像素，底图 reroll 免改码。
 *
 * 当前消费者：
 *  - focusY  → PickerScene 的 SceneBitmap object-position（竖构图裁切时保住焦点带）；
 *  - anchors → SceneBreakfast 炊烟位、SceneDinner 星/流星带。
 * 声明但暂未消费（留给 S4 桌面双栏 / 验收脚本）：focalBand（禁遮挡区）、heroAlign、dockBlend。
 */

import type { MealType } from "@/types/food";
import { mealScene, type SceneKey } from "./picker-meal-scenes";

export interface ArtMeta {
  /** object-position 纵向锚（%）：竖构图在较矮容器里裁切时保住哪一段。 */
  focusY: number;
  /** 焦点带（画高百分比区间）：验收用——此区间禁止 UI 遮挡。 */
  focalBand: [number, number];
  /** hero 文字块水平对齐（画的负空间在哪，字就往哪靠）。 */
  heroAlign: "center" | "left" | "right";
  /** 点餐坞衔接色（取画底缘主色，坞上缘与画尽量无缝）。S4 消费。 */
  dockBlend: string;
  /** 动效锚点：占画框的百分比坐标（替代一切 vh 定位）。 */
  anchors?: {
    /** 炊烟锚点（breakfast）：每缕的 x/y（画框 %）+ 自己的时长/延迟（秒，错峰）。
     *  dur/delay 随条目走，加第三缕不用改组件（不再靠下标 i===0?8:11 硬编码）。 */
    steam?: Array<{ x: number; y: number; dur: number; delay: number }>;
    /** 流星 / 星带纵向区间（dinner）：[顶, 底]（画框 %），只在此带内起手。 */
    meteorBand?: [number, number];
  };
}

/**
 * 五时段构图档案（依据实拍构图判读，2026-07-15）。
 *  - breakfast：摊子压左、蒸笼在左下（画框 x≈8-16% / y≈60-72%），炊烟叠其上；晨光居中。
 *  - lunch：纯天空 + 风筝，焦点高、无地面 → focusY 靠上，无动效锚点。
 *  - tea：落日 + 电线 + 屋顶人影在中下段；无动效薄层。
 *  - dinner：上 ~42% 纯天空（星/流星带 [0,40]），天际线 + 霓虹在中下段。
 *  - midnight：室内视角，窗外满月在左上、桌上汤面 + 灯下猫在右下；hero 右对齐避开左上满月。
 */
const ART_META: Record<SceneKey, ArtMeta> = {
  breakfast: {
    focusY: 35,
    focalBand: [45, 85],
    heroAlign: "center",
    dockBlend: "rgb(90 62 40)",
    anchors: {
      steam: [
        { x: 8, y: 60, dur: 8, delay: 0 },
        { x: 14, y: 62, dur: 11, delay: -5 },
      ],
    },
  },
  lunch: {
    focusY: 20,
    focalBand: [15, 55],
    heroAlign: "center",
    dockBlend: "rgb(247 233 205)",
  },
  tea: {
    focusY: 42,
    focalBand: [50, 80],
    heroAlign: "center",
    dockBlend: "rgb(74 46 40)",
  },
  dinner: {
    focusY: 40,
    focalBand: [45, 100],
    heroAlign: "center",
    dockBlend: "rgb(18 22 34)",
    anchors: { meteorBand: [0, 40] },
  },
  midnight: {
    focusY: 34,
    focalBand: [55, 90],
    heroAlign: "right",
    dockBlend: "rgb(16 14 20)",
  },
};

/** 取某 meal 的构图档案（经 SceneKey）。 */
export function artMeta(meal: MealType): ArtMeta {
  return ART_META[mealScene(meal).scene];
}
