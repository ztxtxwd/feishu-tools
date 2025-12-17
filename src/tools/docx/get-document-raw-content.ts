import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 获取飞书文档纯文本内容
 */
export const getDocumentRawContent = defineTool({
  name: "get_document_raw_content",
  description: {
    summary: "获取飞书文档的纯文本内容，返回文档中所有文字的纯文本形式。",
    bestFor: "快速获取文档全文内容进行分析、搜索或提取关键信息",
    notRecommendedFor:
      "需要保留文档结构和格式信息（请使用获取文档所有块接口）",
  },
  inputSchema: {
    document_id: z
      .string()
      .length(27)
      .describe(
        "文档的唯一标识。可通过文档 URL 或获取文件夹下文件清单接口获取"
      ),
    lang: z
      .number()
      .int()
      .min(0)
      .max(2)
      .optional()
      .describe(
        "指定返回的 @用户 的语言。0: 用户默认名称（如 @张敏），1: 英文名称（如 @Min Zhang），2: 暂不支持，返回默认名称。默认值: 0"
      ),
  },
  outputSchema: {
    content: z.string().describe("文档纯文本内容"),
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

      const response = await context.client.docx.v1.document.rawContent(
        {
          path: {
            document_id: args.document_id,
          },
          params: {
            lang: args.lang,
          },
        },
        userAccessToken ? lark.withUserAccessToken(userAccessToken) : undefined
      );

      if (response.code !== 0) {
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
          {
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2),
          },
        ],
        structuredContent: response.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
});
