import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import { cleanParams } from "../../utils/clean-params.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 获取电子表格信息
 */
export const getSpreadsheet = defineTool({
  name: "get_spreadsheet",
  description: {
    summary: "根据电子表格 token 获取电子表格的基础信息",
    bestFor: "查询电子表格的所有者、标题、URL 链接等基本信息",
    notRecommendedFor: "获取工作表列表请使用 query_sheets，获取单元格数据请使用 read_range",
  },
  inputSchema: {
    spreadsheet_token: z.string().describe("电子表格的 token，可从电子表格 URL 中获取"),
    user_id_type: z.enum(["open_id", "union_id", "user_id"]).optional().describe("用户 ID 类型，默认为 open_id"),
  },
  outputSchema: {
    spreadsheet: z.object({
      title: z.string().optional().describe("电子表格标题"),
      owner_id: z.string().optional().describe("电子表格的所有者 ID"),
      token: z.string().optional().describe("电子表格 token"),
      url: z.string().optional().describe("电子表格的 URL 链接"),
    }).optional().describe("电子表格的基础信息"),
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

      const response = await context.client.sheets.v3.spreadsheet.get(
        {
          path: {
            spreadsheet_token: args.spreadsheet_token,
          },
          params: cleanParams({
            user_id_type: args.user_id_type,
          }),
        },
        userAccessToken ? lark.withUserAccessToken(userAccessToken) : undefined
      );

      if (response.code !== 0) {
        if (response.code === 99991400) {
          return {
            content: [
              {
                type: "text" as const,
                text: `应用频率限制：已超过每分钟 100 次的调用上限。请使用指数退避算法降低调用速率后重试。\n错误码: ${response.code}\n错误信息: ${response.msg || "请求过于频繁"}`,
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
      if (message.includes("99991400") || message.includes("rate limit") || message.includes("频率限制")) {
        return {
          content: [
            {
              type: "text" as const,
              text: `应用频率限制：已超过每分钟 100 次的调用上限。请使用指数退避算法降低调用速率后重试。\n错误信息: ${message}`,
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
