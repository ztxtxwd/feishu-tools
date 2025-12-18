import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 修改电子表格属性
 */
export const updateSpreadsheet = defineTool({
  name: "update_spreadsheet",
  description: {
    summary: "修改电子表格的属性，目前支持修改电子表格标题",
    bestFor: "重命名电子表格",
    notRecommendedFor: "修改工作表属性请使用 update_sheet_metadata，获取电子表格信息请使用 get_spreadsheet",
  },
  inputSchema: {
    spreadsheet_token: z.string().describe("电子表格的 token，可从电子表格 URL 中获取"),
    title: z.string().optional().describe("新的电子表格标题。参数为空时，表格标题将显示为\"未命名表格\""),
  },
  outputSchema: {
    success: z.boolean().describe("操作是否成功"),
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

      const response = await context.client.sheets.v3.spreadsheet.patch(
        {
          path: {
            spreadsheet_token: args.spreadsheet_token,
          },
          data: {
            title: args.title,
          },
        },
        userAccessToken ? lark.withUserAccessToken(userAccessToken) : undefined
      );

      if (response.code !== 0) {
        if (response.code === 99991400) {
          return {
            content: [
              {
                type: "text" as const,
                text: `应用频率限制：已超过每分钟 20 次的调用上限。请使用指数退避算法降低调用速率后重试。\n错误码: ${response.code}\n错误信息: ${response.msg || "请求过于频繁"}`,
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
          { type: "text" as const, text: JSON.stringify({ success: true }, null, 2) },
        ],
        structuredContent: { success: true },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("99991400") || message.includes("rate limit") || message.includes("频率限制")) {
        return {
          content: [
            {
              type: "text" as const,
              text: `应用频率限制：已超过每分钟 20 次的调用上限。请使用指数退避算法降低调用速率后重试。\n错误信息: ${message}`,
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
