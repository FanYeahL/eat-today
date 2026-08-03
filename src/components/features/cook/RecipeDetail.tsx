"use client";

import type { GeneratedRecipe } from "@/config/datasets/types";

type RecipeDetailProps = {
  recipe: GeneratedRecipe;
};

/** 几个做法搜索平台的跳转链接 */
function externalLinks(name: string) {
  const q = encodeURIComponent(`${name}做法`);
  return [
    { label: "下厨房", href: `https://www.xiachufang.com/search/?keyword=${q}` },
    { label: "B站教程", href: `https://search.bilibili.com/all?keyword=${q}` },
    {
      label: "小红书",
      href: `https://www.xiaohongshu.com/search_result?keyword=${q}`,
    },
  ];
}

/**
 * 菜谱详情卡片
 * 展示一条 GeneratedRecipe（来自 HowToCook 数据集）的食材 + 步骤，
 * 并附外部教程跳转。视觉与「自己动手」RecipeCard 一致。
 */
export default function RecipeDetail({ recipe }: RecipeDetailProps) {
  const links = externalLinks(recipe.name);
  const hasIngredients = recipe.ingredients.length > 0;
  const hasSteps = recipe.steps.length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-accent/40 bg-surface/70 p-4 text-left">
      <p className="flex items-center gap-2 text-base font-semibold text-ink">
        <span className="text-2xl leading-none">{recipe.emoji}</span>
        {recipe.name}
      </p>

      {/* 食材 */}
      {hasIngredients && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-brand-soft">
            食材 / 工具
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recipe.ingredients.map((ing, i) => (
              <span
                key={`${ing}-${i}`}
                className="rounded-md bg-brand/15 px-2 py-1 text-xs text-ink"
              >
                {ing}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 步骤 */}
      {hasSteps && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-brand-soft">
            做法
          </p>
          <ol className="flex flex-col gap-1.5">
            {recipe.steps.map((step, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-ink"
              >
                <span className="shrink-0 font-bold text-accent">
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 数据异常兜底：两段都空 */}
      {!hasIngredients && !hasSteps && (
        <p className="text-sm text-ink-muted/70">
          这道菜的详细做法没抓全，去下面平台搜搜看 👇
        </p>
      )}

      {/* 外部教程跳转 */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-brand-soft">
          看详细教程
        </p>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-brand/50 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      </div>

      {/* 数据来源署名（MIT） */}
      <p className="text-[10px] text-ink-muted/40">
        菜谱数据来自开源项目 HowToCook (MIT)
      </p>
    </div>
  );
}
