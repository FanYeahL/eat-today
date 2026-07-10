# 品牌字体（得意黑 / Smiley Sans）—— 仅 /picker

## 是什么

`/picker`（今日菜单板）的品牌展示字体，用得意黑（Smiley Sans）**子集**。
只用于三类文本，靠字号/色/布局出彩，不 fake bold：

- 首页品牌大标题「今天吃什么」
- result 页菜名
- loading 短句（重点词）

正文、店铺列表、按钮小字、chip、说明文案 **一律仍用系统无衬线字体**。

## 关键约束

- **只作用于 /picker**：`next/font/local` 在 `src/app/picker/page.tsx` 注入 CSS 变量
  `--font-brand`，挂在 `.picker-theme` 容器上。**不改全局 layout**，旧 `/water-concept`
  不加载此字体。
- `preload: false` + `display: swap`：不抢主站首屏字体预载带宽；字体到位前先用系统字体
  兜底，无白屏、无 FOIT。
- CSS 里 `.picker-brand { font-family: var(--font-brand), var(--font-ui); }`——
  只引用变量 + 系统兜底，**不手写字体名**，避免与 next/font 生成名不一致。

## 子集覆盖范围

字符来源（脚本 `scripts/gen-brand-font-subset.mjs` 直接 import 真源，非正则）：

1. `src/config/foods.ts` 全部 371 道菜的 `name`（唯一展示的菜名字段）
2. `src/components/features/picker/picker-copy.ts` 全部品牌/按钮/loading/结果文案
3. 手工补充：餐段词、筛选词、结果页常见词
4. 数字 0-9、英文 A-Z/a-z、常见单位、常用中英文标点

当前产物：`src/app/fonts/SmileySans-subset.woff2` ≈ **83 KB**，664 唯一字符。

## ⚠️ 新增菜名后：重生成字体

新增/改菜名后，若品牌字体没覆盖到某些字，那几个字会**优雅回落系统字体**（不白屏）。
要让新字也用品牌字，重跑：

```bash
npm run font:brand
```

脚本会打印：唯一字符数 / 菜名数 / woff2 大小 / 异常字段提示。
（前置依赖：`python3 -m pip install --user fonttools brotli`；源 TTF 见脚本头注，
或用环境变量 `SMILEY_TTF` 指定路径。）

## 许可证

得意黑 = **SIL Open Font License 1.1**（可嵌入/子集/商用；须随附 OFL 文本；
保留字体名 "Smiley" / "得意黑"）。许可证随库：`src/app/fonts/OFL.txt`。
下载源与版本见 `scripts/gen-brand-font-subset.mjs` 头部注释（release v2.0.1）。
