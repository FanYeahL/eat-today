"use client";

import { useEffect, useRef, useState } from "react";
import { useDivinationPick, type CastResult } from "./useDivinationPick";
import { useShops } from "./useShops";
import { addEntry } from "@/lib/diary";
import { logPick, type PickAction } from "@/lib/pick-log";
import { recordVisit } from "@/lib/regulars";
import { keywordOf } from "@/lib/availability";
import { resetGeo } from "@/lib/geo";
import type { Food } from "@/types/food";

export type CastMode = "initial" | "recast" | "fresh";
interface OrchestrationOptions {
  onCastStart?: (mode: CastMode) => void;
  onCastResult?: (result: CastResult, mode: CastMode) => void;
  onCastFailed?: () => void;
  onExplore?: () => void;
  onHome?: () => void;
  /** 主题的最短悬念时长；与真实抽取并行，水主题在成功后自行播放落水动画。 */
  minRevealMs?: number;
  /** 历史主题差异：水主题新一轮仍硬避当前菜，默认主题仅沿用核心的上一签软避。 */
  excludeCurrentOnFresh?: boolean;
  /** 水主题原有返回行为暂时保留；默认主题返回时清理探店请求。 */
  clearShopsOnHome?: boolean;
}

/**
 * 双主题共同的业务编排。phase、面板、文案与动画留在皮肤。
 * seenRef 同步保序，castingRef 同步锁住动作（含埋点），请求代次隔离返回/卸载后的结果。
 */
export function useFoodOrchestration(options: OrchestrationOptions = {}) {
  const div = useDivinationPick();
  const shopState = useShops();
  const [basket, setBasket] = useState<Food[]>([]);
  const [confirmed, setConfirmed] = useState<Food[]>([]);
  const [exploringId, setExploringId] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [casting, setCasting] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);
  const seenRef = useRef(new Set<string>());
  const castingRef = useRef(false);
  const generation = useRef(0);
  const suspense = useRef<{
    timer: ReturnType<typeof setTimeout>;
    resolve: () => void;
  } | null>(null);

  function clearSuspense() {
    if (!suspense.current) return;
    clearTimeout(suspense.current.timer);
    suspense.current.resolve();
    suspense.current = null;
  }
  useEffect(
    () => () => {
      generation.current++;
      clearSuspense();
    },
    [],
  );

  async function runCast(mode: CastMode = "initial") {
    if (castingRef.current) return;
    castingRef.current = true;
    const mine = ++generation.current;
    setCasting(true);
    setCastError(null);
    try {
      if (
        mode === "recast" ||
        (mode === "fresh" && options.excludeCurrentOnFresh)
      ) {
        if (div.pick) seenRef.current.add(div.pick.id);
      }
      options.onCastStart?.(mode);
      const pause = new Promise<void>((resolve) => {
        if (!options.minRevealMs) {
          resolve();
          return;
        }
        const timer = setTimeout(() => {
          suspense.current = null;
          resolve();
        }, options.minRevealMs);
        suspense.current = { timer, resolve };
      });
      const [result] = await Promise.all([div.cast(seenRef.current), pause]);
      if (mine !== generation.current) return;
      if (result.food) {
        seenRef.current.add(result.food.id);
        setExhausted(false);
      } else if (result.exhausted) {
        setExhausted(true);
      }
      options.onCastResult?.(result, mode);
    } catch {
      if (mine !== generation.current) return;
      setCastError("这次没选出来，再试一次吧。");
      options.onCastFailed?.();
    } finally {
      if (mine === generation.current) {
        clearSuspense();
        castingRef.current = false;
        setCasting(false);
      }
    }
  }

  function logCurrent(action: PickAction) {
    if (div.pick) logPick(div.pick, div.filters.budget, action, Date.now());
  }
  function onAddAndRecast() {
    if (castingRef.current) return;
    const food = div.pick;
    if (food) {
      logCurrent("accept");
      setBasket((prev) =>
        prev.some((f) => f.id === food.id) ? prev : [...prev, food],
      );
    }
    void runCast("recast");
  }
  function onSkipAndRecast() {
    if (castingRef.current) return;
    logCurrent("reroll");
    void runCast("recast");
  }
  function onFreshRecast() {
    if (castingRef.current) return;
    logCurrent("reroll");
    setBasket([]);
    setConfirmed([]);
    setExploringId(null);
    seenRef.current = new Set();
    setExhausted(false);
    void runCast("fresh");
  }
  function removeFromBasket(id: string) {
    setBasket((prev) => prev.filter((f) => f.id !== id));
  }

  function commitTable(table: Food[]) {
    if (!table.length) return;
    addEntry(table, div.meal, Date.now());
    setConfirmed(table);
    setBasket([]);
    seenRef.current = new Set();
    setExhausted(false);
    setExploringId(table[0].id);
    options.onExplore?.();
    void shopState.fetchShops(keywordOf(table[0]));
  }
  function onConfirm() {
    if (castingRef.current) return;
    logCurrent("accept");
    const table = Array.from(
      new Map(
        [...basket, ...(div.pick ? [div.pick] : [])].map((f) => [f.id, f]),
      ).values(),
    );
    commitTable(table);
  }
  function onConfirmBasketOnly() {
    if (castingRef.current) return;
    logCurrent("reroll");
    commitTable([...basket]);
  }
  function onHome() {
    generation.current++;
    clearSuspense();
    castingRef.current = false;
    setCasting(false);
    setCastError(null);
    div.reset();
    if (options.clearShopsOnHome !== false) shopState.clear();
    setBasket([]);
    setConfirmed([]);
    setExploringId(null);
    seenRef.current = new Set();
    setExhausted(false);
    options.onHome?.();
  }
  function onChangeFilters(next: typeof div.filters) {
    setExhausted(false);
    div.setFilters(next);
  }
  function onChangeMeal(next: typeof div.meal) {
    setExhausted(false);
    div.setMeal(next);
  }
  function onChangeRegion(next: typeof div.region) {
    setExhausted(false);
    div.setRegion(next);
  }

  const exploringFood =
    confirmed.find((f) => f.id === exploringId) ?? confirmed[0] ?? div.pick;
  function onPickExploreDish(id: string) {
    const target = confirmed.find((f) => f.id === id);
    if (!target) return;
    setExploringId(id);
    void shopState.fetchShops(keywordOf(target));
  }
  function onReExplore() {
    options.onExplore?.();
    const target = confirmed.find((f) => f.id === exploringId) ?? confirmed[0];
    if (target) void shopState.fetchShops(keywordOf(target));
  }
  function onVisitShop(shop: { id: string; name: string }) {
    if (!exploringFood) return;
    recordVisit(
      {
        shopId: shop.id,
        shopName: shop.name,
        foodId: exploringFood.id,
        cuisine: exploringFood.cuisine,
        kind: exploringFood.kind,
      },
      Date.now(),
    );
  }
  function onPickCity(city: string) {
    if (exploringFood)
      void shopState.fetchShops(keywordOf(exploringFood), city);
  }
  function onRetryGeo() {
    if (!exploringFood || shopState.loading) return;
    resetGeo();
    void shopState.fetchShops(keywordOf(exploringFood));
  }

  return {
    div,
    ...shopState,
    basket,
    confirmed,
    exploringId,
    exploringFood,
    exhausted,
    casting,
    castError,
    runCast,
    onAddAndRecast,
    onSkipAndRecast,
    onFreshRecast,
    removeFromBasket,
    onConfirm,
    onConfirmBasketOnly,
    onHome,
    onChangeFilters,
    onChangeMeal,
    onChangeRegion,
    onPickExploreDish,
    onReExplore,
    onVisitShop,
    onPickCity,
    onRetryGeo,
  };
}
