"use client";

/**
 * 水占·自己做（翻菜谱）面板
 * ─────────────────────────────────────────────
 * 把「自己做」从老虎机搬到水占。水占已用「投签」承担了「替你选餐厅」的随机仪式，
 * 这里不再重复单轴摇号，只移植真正实用的那半——可搜索 / 分类的菜谱库
 * （复用 RecipeLibrary，它本就用全站浅色 token，落进水占氛围毫无违和）。
 *
 * 想自己下厨的人，要的是「翻到一道想做的菜 + 看做法」，而不是再被随机一次。
 * 数据走 /api/recipes（与老虎机同一份 HowToCook 数据集）。
 */

import { motion } from "framer-motion";
import RecipeLibrary from "@/components/features/cook/RecipeLibrary";

type WaterRecipePanelProps = {
  /** 收回面板，回到投签场景 */
  onClose: () => void;
};

export default function WaterRecipePanel({ onClose }: WaterRecipePanelProps) {
  return (
    <motion.div
      key="recipe-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute inset-0 z-50 flex flex-col items-center overflow-y-auto px-5 pb-12 pt-24"
      style={{
        background:
          "linear-gradient(180deg, rgba(240,247,244,0.92) 0%, rgba(227,239,234,0.96) 100%)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        <button
          onClick={onClose}
          className="self-start text-sm text-brand-soft transition-colors hover:text-accent"
        >
          ← 收回签纸
        </button>

        <div className="flex flex-col items-center gap-1">
          <span className="text-sm uppercase tracking-[0.3em] text-brand-soft">
            自 己 做
          </span>
          <p className="text-xs text-ink-muted/60">
            今天想下厨？翻一道想做的菜，照着做就行
          </p>
        </div>

        <RecipeLibrary />
      </div>
    </motion.div>
  );
}
