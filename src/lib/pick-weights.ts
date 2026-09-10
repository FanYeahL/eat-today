/** 仅集中配置，不调整原有概率；取值理由与规格详见 pick-core 对应函数。 */
export const PICK_WEIGHTS = {
  seeded: 8, // 种草优先
  previous: 0.05, // 上一签强避，但不归零
  recent: 0.35, // 最近吃过温和避重
  mainRole: 1.6, // §5.3 偏正餐，tea 豁免
  canonicalGroup: 0.15, // §5.4 相似菜族软避
  moodMismatch: 0.15, // 心情不匹配仍可兜底
} as const;
