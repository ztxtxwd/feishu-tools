import type { TokenProvider } from "../types.js";

/**
 * 解析 TokenProvider，支持静态字符串或动态获取函数
 * @param provider - Token 提供者（字符串或函数）
 * @returns 解析后的 token 字符串，如果 provider 为 undefined 则返回 undefined
 */
export async function resolveToken(provider: TokenProvider | undefined): Promise<string | undefined> {
  if (provider === undefined) {
    return undefined;
  }
  if (typeof provider === "function") {
    return await provider();
  }
  return provider;
}
