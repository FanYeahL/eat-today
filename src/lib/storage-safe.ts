/** 存储边界只处理 IO；记录结构、嵌套修复及裁剪规则由各模块提供。 */
export function safeGetList<T>(
  key: string,
  parseItem: (value: unknown) => T | null,
): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const result: T[] = [];
    for (const value of parsed) {
      const item = parseItem(value);
      if (item !== null) result.push(item);
    }
    return result;
  } catch {
    return [];
  }
}

export function safeSetList<T>(key: string, items: readonly T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* 配额/隐私模式不阻断主流程。 */
  }
}

export function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* 同读写契约。 */
  }
}
