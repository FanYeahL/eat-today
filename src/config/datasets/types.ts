/**
 * 构建期摄取产物的类型定义
 *
 * 这些数据由 scripts/ingest-recipes.mjs 从开源数据集
 * （Anduin2017/HowToCook, MIT License）离线清洗富化而来，
 * 仅用于「附近买不到 → 自己动手」菜谱库，**不进抽取**。
 *
 * 与运行时核心的 Food 类型刻意解耦：
 * 转轮要的 meals / recommend / tags / 文案是人工精修字段，
 * 不应由外部数据集硬造，故这里只保留能从数据集可靠提取的字段。
 */

/** 富化后判定的种类；抽取分层的 main/drink 拆分在这里仅作大类参考 */
export type GeneratedKind = "main" | "drink";

/** HowToCook 的源目录分类，保留以便溯源与二次筛选 */
export type GeneratedCategory =
  | "aquatic"
  | "breakfast"
  | "dessert"
  | "drink"
  | "meat_dish"
  | "soup"
  | "staple"
  | "vegetable_dish";

/** 一条由数据集清洗富化得到的菜谱 */
export interface GeneratedRecipe {
  /** 唯一标识，由菜名 slug 化得到 */
  id: string;
  /** 菜名（已去除「的做法」后缀） */
  name: string;
  /** 富化判定的种类 */
  kind: GeneratedKind;
  /** 源数据集目录分类 */
  category: GeneratedCategory;
  /** 富化补上的 emoji（规则引擎产出，保证非空） */
  emoji: string;
  /** 原料 / 工具清单 */
  ingredients: string[];
  /** 操作步骤（已清理 markdown 标记） */
  steps: string[];
}

/** recipes.generated.json 的顶层结构，含数据来源署名（满足 MIT 要求） */
export interface GeneratedRecipeDataset {
  /** 数据来源说明 */
  source: {
    repo: string;
    url: string;
    license: string;
    /** 生成脚本，便于追溯 */
    generatedBy: string;
  };
  /** 清洗富化后的菜谱总数 */
  count: number;
  /** 菜谱列表 */
  recipes: GeneratedRecipe[];
}

/**
 * 轻量索引条目（recipes.index.json）
 *
 * 只含抽取滚轮 + 菜谱库列表/搜索所需的最小字段，
 * 体积小到可安全 client-import；完整食材/步骤按 id 走 /api/recipes 拉取。
 * 刻意不含 ingredients/steps，避免把 400K+ 重数据打进客户端包。
 */
export interface RecipeIndexEntry {
  id: string;
  name: string;
  kind: GeneratedKind;
  category: GeneratedCategory;
  emoji: string;
}

/** recipes.index.json 的顶层结构 */
export interface RecipeIndex {
  count: number;
  recipes: RecipeIndexEntry[];
}

