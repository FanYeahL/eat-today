"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import recipeIndex from "@/config/datasets/recipes.index.json";
import { useRecipe } from "@/hooks/useRecipe";
import RecipeDetail from "./RecipeDetail";
import type {
  GeneratedCategory,
  RecipeIndex,
  RecipeIndexEntry,
} from "@/config/datasets/types";

const index = recipeIndex as RecipeIndex;

/** 分类筛选项（顺序即 UI 顺序），all 表示全部 */
const CATEGORY_FILTERS: { key: GeneratedCategory | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "meat_dish", label: "🍖 荤菜" },
  { key: "vegetable_dish", label: "🥬 素菜" },
  { key: "staple", label: "🍚 主食" },
  { key: "soup", label: "🍲 汤" },
  { key: "aquatic", label: "🐟 水产" },
  { key: "breakfast", label: "🥢 早餐" },
  { key: "dessert", label: "🍰 甜点" },
  { key: "drink", label: "🥤 饮品" },
];

/** 列表最多渲染条数，避免一次性渲染数百个 DOM 拖慢页面 */
const RENDER_LIMIT = 60;

export default function RecipeLibrary() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<GeneratedCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { recipe, loading, error, fetchRecipe } = useRecipe();

  // 按分类 + 关键字过滤；关键字大小写无关、去空格
  const filtered = useMemo<RecipeIndexEntry[]>(() => {
    const kw = keyword.trim().toLowerCase();
    return index.recipes.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (kw && !r.name.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [keyword, category]);

  const shown = filtered.slice(0, RENDER_LIMIT);
  const overflow = filtered.length - shown.length;

  const toggle = (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    fetchRecipe(id);
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      {/* 搜索框 */}
      <input
        type="search"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜菜名，比如「红烧肉」"
        aria-label="搜索菜谱"
        className="w-full rounded-full border border-brand/50 bg-brand/5 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/40 outline-none transition-colors focus:border-accent"
      />

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_FILTERS.map((f) => {
          const active = category === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setCategory(f.key)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                active
                  ? "border-accent bg-accent-hot/15 text-accent"
                  : "border-brand/40 bg-brand/5 text-ink-muted hover:border-accent/60"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 结果计数 */}
      <p className="text-xs text-ink-muted/60">
        共 {filtered.length} 道
        {overflow > 0 && `（先显示前 ${RENDER_LIMIT} 道，继续搜索缩小范围）`}
      </p>

      {/* 列表 */}
      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted/60">
          没找到「{keyword}」相关的菜，换个词试试 🍳
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((r) => {
            const isOpen = openId === r.id;
            return (
              <li key={r.id}>
                <button
                  onClick={() => toggle(r.id)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    isOpen
                      ? "border-accent/60 bg-surface-2/80"
                      : "border-brand/30 bg-surface/70 hover:border-accent/50"
                  }`}
                >
                  <span className="text-xl leading-none">{r.emoji}</span>
                  <span className="flex-1 font-semibold text-ink">
                    {r.name}
                  </span>
                  <span className="text-xs text-brand-soft">
                    {isOpen ? "收起" : "看做法"}
                  </span>
                </button>

                {/* 展开详情 */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        {loading && (
                          <p className="py-3 text-center text-sm text-ink-muted/70">
                            正在拉取做法…
                          </p>
                        )}
                        {!loading && error && (
                          <p className="py-3 text-center text-sm text-accent-pink">
                            {error}
                          </p>
                        )}
                        {!loading && !error && recipe && recipe.id === r.id && (
                          <RecipeDetail recipe={recipe} />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
