# 饭点场景图片规格

当前使用 V4 场景布局，五张底图均为 **780 × 1163** 像素的 WebP。
文件位于 `public/scenes/{meal}.webp`，meal 为 breakfast、lunch、tea、dinner、midnight。

- 加载与降级：[PickerScene](../src/components/features/picker/scenes/PickerScene.tsx)。加载失败时隐藏图片，保留天空渐变兜底。
- 构图锚点：[picker-art-meta](../src/components/features/picker/picker-art-meta.ts)。替换图片时检查各餐段的焦点位置及裁切。
- 桌面画廊宽度按约 0.671 的宽高比计算；替换尺寸时同步检查页面布局。
- 导出参考：WebP quality 约 80，每张建议不超过 200 KB；以实图清晰度和加载成本验收。
- 验收覆盖手机长屏、手机短屏、桌面，以及常规与 reduced-motion 两种设置；运行 `npm run shoot:picker -- --build` 后检查图片及对比度门。

历史说明：旧 `public/scenes/.gitkeep` 中的 780 × 1688 是 V3 规格，不再代表当前资产。
原注释引用的生图计划未收录在仓库，故不保留该死链，也不把缺失的 prompt pack 当作现行规范。
