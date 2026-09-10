"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveCoords, type Coords, type GeoReason } from "@/lib/geo";
import type { Shop, ShopsResponse } from "@/types/shop";

export type { GeoReason } from "@/lib/geo";

/**
 * 店铺数据 hook
 * 负责「定位（带兜底）→ 调 /api/shops → 管理状态」。
 * 定位走共享的 lib/geo 单例缓存，与「按附近过滤」共用同一次授权，不重复弹权限。
 */
export function useShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  /** 第二层·扩展推荐：同类店（店名不含菜名但常供应），由后端始终给，前端按阈值展示 */
  const [expansion, setExpansion] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 是否需要用户手输城市（定位不可用时置 true） */
  const [needCity, setNeedCity] = useState(false);
  /** 是否已成功完成过一次查询（区分「搜完 0 家」和「还没搜」） */
  const [fetched, setFetched] = useState(false);
  /** 定位失败的具体原因，供 UI 精准提示 */
  const [geoReason, setGeoReason] = useState<GeoReason>(null);
  /**
   * 请求序号：快速切菜（探店 chip）会连发多次 fetchShops，
   * 老请求若后到会用旧店覆盖新选中那道菜的店。每次自增，回调里只认最新一号，
   * 旧响应直接丢弃（与 useRecipe 同款防串号守卫）。
   */
  const reqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      reqIdRef.current++;
      abortRef.current?.abort();
    },
    [],
  );

  /**
   * 查询某关键字的店铺。
   * @param keyword 食物名
   * @param city    手输城市；定位不可用时由组件传入
   */
  const fetchShops = useCallback(async (keyword: string, city?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const reqId = ++reqIdRef.current; // 本次请求号；只有它仍是最新时才写状态
    const fresh = () =>
      reqId === reqIdRef.current && !controller.signal.aborted;
    setLoading(true);
    setError(null);
    setShops([]);
    setExpansion([]);
    setFetched(false);
    // 用户已手输城市：先摘掉 needCity。否则查店失败时 needCity 仍为 true，
    // UI 分支先判 needCity 会继续显示「选城市」，把真正的 error 藏住（Codex P0）。
    if (city) setNeedCity(false);

    // 先确定坐标：走共享缓存，没有则尝试定位一次
    let coords: Coords | null = null;
    if (!city) {
      try {
        coords = await resolveCoords();
        if (fresh()) setGeoReason(null);
      } catch (reason) {
        if (fresh()) setGeoReason((reason as GeoReason) ?? "unsupported");
      }
    }

    // 定位是共享 Promise，无法单独取消；离开/切菜后不要再发旧的查店请求。
    if (!fresh()) return;

    // 既没坐标也没城市 → 提示用户手输城市，不发请求
    if (!coords && !city) {
      if (fresh()) {
        setNeedCity(true);
        setLoading(false);
        setError("无法获取你的位置，请输入所在城市后再查。");
      }
      return;
    }

    // 定位已恢复，即使后续 API 失败也应展示查询错误，而非旧的选城市界面。
    setNeedCity(false);
    const params = new URLSearchParams({ keyword });
    if (coords) {
      params.set("lng", String(coords.lng));
      params.set("lat", String(coords.lat));
    } else if (city) {
      params.set("city", city);
    }

    try {
      const res = await fetch(`/api/shops?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = (await res.json()) as ShopsResponse & { error?: string };
      if (!fresh()) return; // 已有更新的请求发出，本次结果作废，不写状态
      if (!res.ok) {
        throw new Error(data.error ?? "查询失败");
      }
      setShops(data.shops);
      setExpansion(data.expansion ?? []);
      setNeedCity(false);
      // 注意：0 家不再算错误。严格匹配少/空时，交给组件用 expansion 做第二层推荐。
      setFetched(true);
    } catch (e) {
      if (!fresh()) return;
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "查询失败，请重试。");
    } finally {
      if (fresh()) setLoading(false);
    }
  }, []);

  /** 清空，收起列表时调用 */
  const clear = useCallback(() => {
    reqIdRef.current++; // 作废所有在途请求，避免清空后又被旧响应写回
    abortRef.current?.abort();
    abortRef.current = null;
    setShops([]);
    setExpansion([]);
    setError(null);
    setLoading(false);
    setFetched(false);
    setNeedCity(false);
    setGeoReason(null);
  }, []);

  return {
    shops,
    expansion,
    loading,
    error,
    needCity,
    fetched,
    geoReason,
    fetchShops,
    clear,
  };
}
