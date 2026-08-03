import { NextResponse } from "next/server";
import dataset from "@/config/datasets/recipes.generated.json";
import type {
  GeneratedRecipe,
  GeneratedRecipeDataset,
} from "@/config/datasets/types";

/**
 * 菜谱详情代理
 * 完整菜谱数据集（含食材/步骤，~400KB）只在服务端加载，
 * 浏览器按 id 来这里拉单条详情，避免把整包打进客户端。
 *
 * 用法：
 *   /api/recipes?id=htc-xxx-12  → 返回该 id 的完整菜谱
 */

// 模块级构建一次 id→菜谱 的索引，常驻进程、跨请求复用，查询 O(1)。
const { recipes } = dataset as GeneratedRecipeDataset;
const byId = new Map<string, GeneratedRecipe>(recipes.map((r) => [r.id, r]));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数。" }, { status: 400 });
  }

  const recipe = byId.get(id);
  if (!recipe) {
    return NextResponse.json(
      { error: `未找到菜谱：${id}` },
      { status: 404 },
    );
  }

  // 菜谱是构建期静态产物，可长缓存
  return NextResponse.json(
    { recipe },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
