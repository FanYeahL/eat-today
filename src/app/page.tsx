"use client";

/**
 * 首页（/）· 风格分发器（灰度期）
 * ─────────────────────────────────────────────
 * 不再直接渲染某一套 UI，而是读用户上次选择的风格，跳到对应路由：
 *   - localStorage 里是 "classic" → /water-concept（经典水占）
 *   - "menu" / 无记录 / 读取失败    → /picker（新版菜单板，默认）
 *
 * SSR/CSR 水合：localStorage 只能在客户端读，所以服务端 + 首帧统一渲染
 * 一个轻量 splash（不读 storage，两端一致 → 不会水合报错），挂载后在
 * effect 里读偏好并 router.replace 到目标页（replace 不留这层在历史里，
 * 返回键不会卡在 splash）。整段几乎瞬时，用户基本只看到目标页。
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_UI_STYLE, UI_STYLE_ROUTES, readUiStyle } from "@/lib/ui-style";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const style = readUiStyle() ?? DEFAULT_UI_STYLE;
    router.replace(UI_STYLE_ROUTES[style]);
  }, [router]);

  // 轻量占位：只在跳转前一瞬可见，两端渲染一致（不碰 storage）。
  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{
        background:
          "radial-gradient(circle at 50% 42%, #f0f7f4 0%, #e4efea 45%, #d3e4df 100%)",
      }}
    >
      <p className="text-sm tracking-[0.3em] text-slate-500">今天吃什么…</p>
    </main>
  );
}
