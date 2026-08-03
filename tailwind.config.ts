import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 语义配色 token，对应 globals.css 的通道变量。
        // 用 rgb(var(--x) / <alpha-value>) 形式，保留 text-brand/50 这类透明度写法。
        base: "rgb(var(--c-base) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--c-surface-2) / <alpha-value>)",
        brand: "rgb(var(--c-brand) / <alpha-value>)",
        "brand-soft": "rgb(var(--c-brand-soft) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        "accent-hot": "rgb(var(--c-accent-hot) / <alpha-value>)",
        "accent-pink": "rgb(var(--c-accent-pink) / <alpha-value>)",
        info: "rgb(var(--c-info) / <alpha-value>)",
        olive: "rgb(var(--c-olive) / <alpha-value>)",
        mustard: "rgb(var(--c-mustard) / <alpha-value>)",
        gold: "rgb(var(--c-gold) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--c-ink-muted) / <alpha-value>)",
        paper: "rgb(var(--c-paper) / <alpha-value>)",
      },
      keyframes: {
        // 流光：把一条亮带从左扫到右，配合 2x 宽的渐变背景
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 3.5s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
