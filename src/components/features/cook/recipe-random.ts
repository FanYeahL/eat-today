"use client";

/**
 * 菜谱随机选取（共享纯逻辑）
 * ─────────────────────────────────────────────
 * 「摇一道菜来做」的随机核心：从菜谱索引里随机取一道，尽量避开上一道。
 * 被「自己做」的两处入口共用——CookMode 的单轴摇菜谱、水占·自己做面板的
 * 轻量「摇一道菜」按钮，避免各写一份随机逻辑漂移。
 */

import recipeIndex from "@/config/datasets/recipes.index.json";
import type { RecipeIndex, RecipeIndexEntry } from "@/config/datasets/types";

const index = recipeIndex as RecipeIndex;

/** 全部菜谱索引条目（344 道） */
export const ALL_RECIPES: RecipeIndexEntry[] = index.recipes;

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 取一道随机菜，尽量避开上一道（池子够大时循环重抽成本极低） */
export function pickNextRecipe(avoidId: string | null): RecipeIndexEntry {
  if (ALL_RECIPES.length <= 1) return ALL_RECIPES[0];
  let next = pickRandom(ALL_RECIPES);
  while (next.id === avoidId) next = pickRandom(ALL_RECIPES);
  return next;
}
