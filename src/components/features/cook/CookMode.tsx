"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reel, { ITEM_HEIGHT } from "@/components/features/roulette/Reel";
import NeonButton from "@/components/common/NeonButton";
import RecipeDetail from "./RecipeDetail";
import RecipeLibrary from "./RecipeLibrary";
import { useRecipe } from "@/hooks/useRecipe";
import recipeIndex from "@/config/datasets/recipes.index.json";
import type { RecipeIndex, RecipeIndexEntry } from "@/config/datasets/types";

const index = recipeIndex as RecipeIndex;
const ALL: RecipeIndexEntry[] = index.recipes;

/** 单轴转动时长（秒） */
const DURATION = 3;

type CookStatus = "idle" | "spinning" | "done";
type CookView = "roulette" | "library";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 取一道随机菜，尽量避开上一道（池子够大时） */
function pickNext(avoidId: string | null): RecipeIndexEntry {
  if (ALL.length <= 1) return ALL[0];
  let next = pickRandom(ALL);
  // 池有 344 道，循环重抽成本极低
  while (next.id === avoidId) next = pickRandom(ALL);
  return next;
}

/**
 * 「自己做」模式
 * 单轴老虎机摇一道随机菜 → 停稳后按 id 拉完整菜谱展示；
 * 也可切到「我自己翻」进可搜索菜谱库。
 */
export default function CookMode() {
  const [view, setView] = useState<CookView>("roulette");
  const [status, setStatus] = useState<CookStatus>("idle");
  const [spinId, setSpinId] = useState(0);
  const [target, setTarget] = useState<RecipeIndexEntry | null>(null);

  const { recipe, loading, error, fetchRecipe } = useRecipe();

  // 数据集为空的极端兜底（正常不会发生，但别让组件崩）
  const empty = ALL.length === 0;

  const handleSpin = useCallback(() => {
    const next = pickNext(target?.id ?? null);
    setTarget(next);
    setSpinId((n) => n + 1);
    setStatus("spinning");
  }, [target]);

  // 滚轮停稳：翻到 done 并拉详情
  const handleRest = useCallback(() => {
    setStatus("done");
    if (target) fetchRecipe(target.id);
  }, [target, fetchRecipe]);

  const isDone = status === "done";

  // 滚轮池：稳定引用，避免每次渲染重建
  const pool = useMemo(() => ALL, []);

  if (empty) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted/70">
        菜谱库为空，请先运行 scripts/ingest-recipes.mjs 生成数据。
      </p>
    );
  }

  // ===== 菜谱库视图 =====
  if (view === "library") {
    return (
      <div className="flex flex-col items-center gap-5">
        <button
          onClick={() => setView("roulette")}
          className="self-start text-sm text-brand-soft transition-colors hover:text-accent"
        >
          ← 回到摇一摇
        </button>
        <RecipeLibrary />
      </div>
    );
  }

  // ===== 老虎机视图 =====
  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-sm uppercase tracking-[0.3em] text-brand-soft">
        {isDone ? "今天就做这道" : status === "spinning" ? "天选今日菜谱…" : "摇一道菜来做"}
      </p>

      {/* 单轴滚轮：首次摇之前不预滚任何菜，给个空占位框 */}
      {target ? (
        <Reel
          pool={pool}
          target={target}
          spinId={spinId}
          duration={DURATION}
          onRest={status === "spinning" ? handleRest : undefined}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-2xl border border-brand/50 bg-surface/80 shadow-[0_4px_14px_rgb(var(--c-brand)_/_0.18)] backdrop-blur"
          style={{ height: ITEM_HEIGHT, width: 132 }}
        >
          <span className="text-3xl leading-none text-brand-soft/60">?</span>
        </div>
      )}

      {/* 结果详情 */}
      <AnimatePresence mode="wait">
        {isDone && target && (
          <motion.div
            key={target.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex w-full max-w-md flex-col items-center gap-4"
          >
            {loading && (
              <p className="py-3 text-center text-sm text-ink-muted/70">
                正在拉取「{target.name}」的做法…
              </p>
            )}
            {!loading && error && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-accent-pink">{error}</p>
                <NeonButton onClick={() => fetchRecipe(target.id)} variant="ghost">
                  重试
                </NeonButton>
              </div>
            )}
            {!loading && !error && recipe && recipe.id === target.id && (
              <RecipeDetail recipe={recipe} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 操作区 */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <NeonButton onClick={handleSpin} variant="primary">
          {status === "idle" ? "🎰 摇一道菜" : "🎰 再摇一道"}
        </NeonButton>
        <NeonButton onClick={() => setView("library")} variant="ghost">
          📖 我自己翻
        </NeonButton>
      </div>
    </div>
  );
}
