"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeneratedRecipe } from "@/config/datasets/types";

/**
 * 按 id 拉取单条完整菜谱（食材 + 步骤）。
 *
 * 完整数据集只在服务端，浏览器走 /api/recipes?id= 取单条。
 * 用 AbortController + 自增请求序号双保险，避免「快速连摇」时
 * 旧请求晚到覆盖新结果的竞态。
 */
export interface UseRecipeState {
  recipe: GeneratedRecipe | null;
  loading: boolean;
  error: string | null;
}

export function useRecipe() {
  const [state, setState] = useState<UseRecipeState>({
    recipe: null,
    loading: false,
    error: null,
  });

  // 进行中的请求控制器 + 最新请求序号
  const controllerRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

  const fetchRecipe = useCallback(async (id: string) => {
    if (!id) {
      setState({ recipe: null, loading: false, error: "缺少菜谱 id。" });
      return;
    }

    // 取消上一笔未完成的请求
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const myReqId = ++reqIdRef.current;

    setState({ recipe: null, loading: true, error: null });

    try {
      const res = await fetch(`/api/recipes?id=${encodeURIComponent(id)}`, {
        signal: controller.signal,
      });

      // 已被更晚的请求取代，丢弃本次结果
      if (myReqId !== reqIdRef.current) return;

      if (!res.ok) {
        const msg =
          res.status === 404
            ? "没找到这道菜的做法。"
            : "拉取菜谱失败，请重试。";
        setState({ recipe: null, loading: false, error: msg });
        return;
      }

      const data = (await res.json()) as { recipe?: GeneratedRecipe };
      if (myReqId !== reqIdRef.current) return;

      if (!data.recipe) {
        setState({ recipe: null, loading: false, error: "菜谱数据异常。" });
        return;
      }

      setState({ recipe: data.recipe, loading: false, error: null });
    } catch (err) {
      // 主动取消不算错误
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (myReqId !== reqIdRef.current) return;
      setState({ recipe: null, loading: false, error: "网络异常，请重试。" });
    }
  }, []);

  // 卸载时取消在途请求
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  return { ...state, fetchRecipe };
}
