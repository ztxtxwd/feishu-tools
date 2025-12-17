/**
 * 移除对象中值为 undefined 的属性
 * 用于构建 API 请求参数，避免传入 undefined 值导致的问题
 */
export function cleanParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}
