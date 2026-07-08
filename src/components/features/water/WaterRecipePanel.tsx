"use client";

/**
 * 水占·自己做（翻菜谱）面板
 * ─────────────────────────────────────────────
 * 「自己做」的次入口，从投签按钮下方的弱入口进入。以可搜索/分类的
 * 菜谱库（RecipeLibrary）为主体——想下厨的人主要靠「翻到一道想做的菜」。
 *
 * 库之上另给一个轻量的「摇一道菜来做」按钮，保留一点随机趣味：点一下随机
 * 抽一道菜、直接展示做法。它是辅、不是主——刻意不做成第二套随机主玩法，
 * 以免和水占「替你决定吃什么」的主流程抢戏（水占才是决策入口）。
 *
 * 随机逻辑复用 cook/recipe-random（与 CookMode 同一份，不重复）；
 * 拉取走 useRecipe（内建 AbortController + 请求序号，连摇不会旧结果覆盖新结果）。
 * 数据走 /api/recipes（HowToCook 数据集）。
 */

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RecipeLibrary from "@/components/features/cook/RecipeLibrary";
import RecipeDetail from "@/components/features/cook/RecipeDetail";
import { pickNextRecipe } from "@/components/features/cook/recipe-random";
import { useRecipe } from "@/hooks/useRecipe";
import type { RecipeIndexEntry } from "@/config/datasets/types";

type WaterRecipePanelProps = {
  /** 收回面板，回到投签场景 */
  onClose: () => void;
};

export default function WaterRecipePanel({ onClose }: WaterRecipePanelProps) {
  // 「摇一道菜」当前选中的菜（null = 还没摇过，只显示库）
  const [shaken, setShaken] = useState<RecipeIndexEntry | null>(null);
  const { recipe, loading, error, fetchRecipe } = useRecipe();

  const handleShake = useCallback(() => {
    const next = pickNextRecipe(shaken?.id ?? null);
    setShaken(next);
    fetchRecipe(next.id);
  }, [shaken, fetchRecipe]);

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

        {/* 轻量随机入口：文案按钮，不喧宾夺主（库才是主体） */}
        <button
          onClick={handleShake}
          className="rounded-full border border-brand/50 bg-brand/5 px-5 py-2 text-sm text-brand-soft transition-colors hover:border-accent hover:text-accent"
        >
          🍳 {shaken ? "再摇一道" : "摇一道菜来做"}
        </button>

        {/* 随机结果：小区域展示在库上方，只在摇过之后出现 */}
        <AnimatePresence mode="wait">
          {shaken && (
            <motion.div
              key={shaken.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full"
            >
              {loading && (
                <p className="py-3 text-center text-sm text-ink-muted/70">
                  正在拉取「{shaken.name}」的做法…
                </p>
              )}
              {!loading && error && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <p className="text-sm text-accent-pink">{error}</p>
                  <button
                    onClick={() => fetchRecipe(shaken.id)}
                    className="text-sm text-brand-soft underline transition-colors hover:text-accent"
                  >
                    重试
                  </button>
                </div>
              )}
              {!loading && !error && recipe && recipe.id === shaken.id && (
                <RecipeDetail recipe={recipe} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 主体：可搜索 / 分类的菜谱库，用户随时自己翻 */}
        <RecipeLibrary />
      </div>
    </motion.div>
  );
}
