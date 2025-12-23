import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 默认的 Emoji 搜索服务 URL
 * 可通过 context.emojiSearchUrl 覆盖
 */
const DEFAULT_EMOJI_SEARCH_URL = "https://feishu-callout-emoji.your-account.workers.dev";

/**
 * 搜索结果 Schema
 */
const emojiSearchResultSchema = z.object({
  emoji_id: z.string().describe("emoji ID（snake_case 格式）"),
  score: z.number().describe("相似度分数，0-1 之间，越高越相似"),
});

/**
 * 搜索飞书高亮块 Emoji 工具
 *
 * 通过语义搜索查找适合的 emoji ID，用于 build_callout_block 的 emoji_id 参数。
 * 基于 Cloudflare Vectorize 实现，支持中英文语义搜索。
 */
export const searchFeishuCalloutEmoji = defineTool({
  name: "search_feishu_callout_emoji",
  description: {
    summary:
      "语义搜索飞书高亮块可用的 emoji ID。输入描述性关键词（如'开心'、'警告'、'火箭'），返回最匹配的 emoji ID 列表。",
    bestFor:
      "查找 build_callout_block 的 emoji_id 参数、根据含义搜索 emoji、不确定 emoji 名称时",
    notRecommendedFor:
      "已知确切 emoji ID 时（直接使用即可）",
  },
  inputSchema: {
    query: z
      .string()
      .min(1)
      .describe("搜索关键词，支持语义搜索。示例: 'happy', '警告', 'rocket', '庆祝'"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(5)
      .describe("返回结果数量，默认 5，最大 20"),
  },
  outputSchema: {
    results: z.array(emojiSearchResultSchema).describe("搜索结果列表，按相似度降序排列"),
  },
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    const url = new URL("/search", DEFAULT_EMOJI_SEARCH_URL);
    url.searchParams.set("q", args.query);
    if (args.limit) {
      url.searchParams.set("limit", String(args.limit));
    }

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Failed to search emoji (HTTP ${response.status}): ${errorText}`,
            },
          ],
          isError: true,
        };
      }

      const data = (await response.json()) as {
        results: Array<{ emoji_id: string; score: number }>;
      };

      // 格式化输出
      const resultText = data.results
        .map((r, i) => `${i + 1}. ${r.emoji_id} (score: ${r.score.toFixed(3)})`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${data.results.length} emoji(s) for "${args.query}":\n\n${resultText}`,
          },
        ],
        structuredContent: {
          results: data.results,
        },
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Failed to search emoji: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
});
