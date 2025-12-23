import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * Block Schema
 */
const blockSchema = z
  .looseObject({
    block_id: z.string().describe("Block 唯一标识（临时 ID）"),
    parent_id: z.string().optional().describe("Block 的父块 ID"),
    children: z.array(z.string()).optional().describe("Block 的子块 ID 列表"),
    block_type: z.number().int().describe("Block 类型"),
  })
  .describe("Block 信息");

/**
 * 将 HTML/Markdown 格式内容转换为文档块
 */
export const convertContentToBlocks = defineTool({
  name: "convert_content_to_blocks",
  description: {
    summary:
      "将 HTML/Markdown 格式的内容转换为飞书文档块结构。返回可直接用于创建文档块的数据结构。",
    bestFor:
      "批量导入 Markdown 或 HTML 内容到飞书文档、将外部内容转换为飞书文档格式",
    notRecommendedFor:
      "直接创建简单文本块（请使用 create_text_block）、需要精确控制块样式时（建议直接构建块结构）",
  },
  inputSchema: {
    content_type: z
      .enum(["markdown", "html"])
      .describe("内容类型：markdown 表示 Markdown 格式，html 表示 HTML 格式"),
    content: z
      .string()
      .min(1)
      .max(10485760)
      .describe("要转换的文本内容，最大长度 10MB"),
    user_id_type: z
      .enum(["open_id", "union_id", "user_id"])
      .optional()
      .describe("用户 ID 类型，用于解析内容中的 @ 用户。默认为 open_id"),
  },
  outputSchema: {
    first_level_block_ids: z
      .array(z.string())
      .describe("第一级 Block 对应的临时 ID 列表，index 代表 Block 的顺序"),
    blocks: z.array(blockSchema).describe("转换后的 Block 列表"),
  },
  callback: async (context, args) => {
    if (!context.client) {
      return {
        content: [
          { type: "text" as const, text: "Error: Feishu client is required" },
        ],
        isError: true,
      };
    }

    try {
      const userAccessToken = await resolveToken(context.getUserAccessToken);

      const response = await context.client.docx.v1.document.convert(
        {
          params: {
            user_id_type: args.user_id_type,
          },
          data: {
            content_type: args.content_type,
            content: args.content,
          },
        },
        userAccessToken ? lark.withUserAccessToken(userAccessToken) : undefined
      );

      if (response.code !== 0) {
        // 处理频率限制错误
        if (response.code === 99991400) {
          return {
            content: [
              {
                type: "text" as const,
                text: `应用频率限制：已超过调用频率上限。请使用指数退避算法降低调用速率后重试。\n错误码: ${response.code}\n错误信息: ${response.msg || "请求过于频繁"}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: response.msg || `API error: ${response.code}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(response.data, null, 2) },
        ],
        structuredContent: response.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // 检查错误信息中是否包含频率限制错误码
      if (
        message.includes("99991400") ||
        message.includes("rate limit") ||
        message.includes("频率限制")
      ) {
        return {
          content: [
            {
              type: "text" as const,
              text: `应用频率限制：已超过调用频率上限。请使用指数退避算法降低调用速率后重试。\n错误信息: ${message}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
});
