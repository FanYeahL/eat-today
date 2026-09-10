"use client";

/**
 * Universal Food Picker · 自己做（V2 轻壳）
 * ─────────────────────────────────────────────
 * 只做视觉统一的轻壳：暖色 organic 面板外壳（背景/标题/返回/容器），
 * 内部原样复用 RecipeLibrary + RecipeDetail + useRecipe，逻辑一行不改
 * （与旧 WaterRecipePanel 共用同一套内部组件与数据源 /api/recipes）。
 *
 * 与旧壳的差别仅在外观 + 去玄学化文案：不叫「收回签纸」，叫「返回」；
 * 标题「自己做」，不带水占仪式感。
 */

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RecipeLibrary from "@/components/features/cook/RecipeLibrary";
import RecipeDetail from "@/components/features/cook/RecipeDetail";
import { pickNextRecipe } from "@/components/features/cook/recipe-random";
import { useRecipe } from "@/hooks/useRecipe";
import { PANEL_COPY } from "./picker-copy";
import type { RecipeIndexEntry } from "@/config/datasets/types";

type RecipePanelV2Props = {
  /** 收起面板，回到主流程 */
  onClose: () => void;
};

export default function RecipePanelV2({ onClose }: RecipePanelV2Props) {
  const [suggested, setSuggested] = useState<RecipeIndexEntry | null>(null);
  const [empty, setEmpty] = useState(false);
  const { recipe, loading, error, fetchRecipe } = useRecipe();

  const handleSuggestRecipe = useCallback(() => {
    const next = pickNextRecipe(suggested?.id ?? null);
    setSuggested(next);
    setEmpty(next === null);
    if (next) fetchRecipe(next.id);
  }, [suggested, fetchRecipe]);

  return (
    <motion.div
      key="recipe-panel-v2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute inset-0 z-50 flex flex-col items-center overflow-y-auto bg-base px-5 pb-12 pt-16"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        <button
          onClick={onClose}
          className="self-start text-sm font-medium text-brand-soft transition-colors hover:text-accent"
        >
          {PANEL_COPY.cook.back}
        </button>

        <div className="flex flex-col items-center gap-1">
          <h2 className="text-2xl font-black text-ink">
            {PANEL_COPY.cook.title}
          </h2>
          <p className="text-xs text-ink-muted/70">
            {PANEL_COPY.cook.subtitle}
          </p>
        </div>

        {/* 轻量随机入口：文案按钮，不喧宾夺主（库才是主体） */}
        <button
          onClick={handleSuggestRecipe}
          className="rounded-full border border-brand/50 bg-brand/5 px-5 py-2 text-sm font-medium text-brand-soft transition-colors hover:border-accent hover:text-accent"
        >
          🍳{" "}
          {suggested ? PANEL_COPY.cook.randomMore : PANEL_COPY.cook.randomFirst}
        </button>

        {/* 随机推荐结果：只在翻过之后出现 */}
        {empty && (
          <p className="text-sm text-ink-muted">暂时没有可推荐的菜谱。</p>
        )}
        <AnimatePresence mode="wait">
          {suggested && (
            <motion.div
              key={suggested.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full"
            >
              {loading && (
                <p className="py-3 text-center text-sm text-ink-muted/70">
                  正在拉取「{suggested.name}」的做法…
                </p>
              )}
              {!loading && error && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <p className="text-sm text-accent-pink">{error}</p>
                  <button
                    onClick={() => fetchRecipe(suggested.id)}
                    className="text-sm text-brand-soft underline transition-colors hover:text-accent"
                  >
                    重试
                  </button>
                </div>
              )}
              {!loading && !error && recipe && recipe.id === suggested.id && (
                <RecipeDetail recipe={recipe} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 主体：可搜索 / 分类的菜谱库（内部走 token，作用域内自动暖色） */}
        <RecipeLibrary />
      </div>
    </motion.div>
  );
}
