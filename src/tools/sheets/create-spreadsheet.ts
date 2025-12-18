import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import { cleanParams } from "../../utils/clean-params.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 创建电子表格
 */
export const createSpreadsheet = defineTool({
  name: "create_spreadsheet",
  description: {
    summary: "在云空间指定目录下创建电子表格",
    bestFor: "创建新的空白电子表格，可指定标题和存放文件夹",
    notRecommendedFor: "基于模板创建表格请使用 drive 的复制文件接口，带内容创建不支持",
  },
  inputSchema: {
    title: z.string().max(255).optional().describe("表格标题，最长 255 个字符"),
    folder_token: z.string().optional().describe("文件夹 token，可从文件夹 URL 中获取。不填则创建在根目录"),
  },
  outputSchema: {
    spreadsheet: z.object({
      title: z.string().optional().describe("电子表格标题"),
      folder_token: z.string().optional().describe("文件夹 token"),
      url: z.string().optional().describe("电子表格的 URL 链接"),
      spreadsheet_token: z.string().optional().describe("电子表格 token"),
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

      const response = await context.client.sheets.v3.spreadsheet.create(
        {
          data: cleanParams({
            title: args.title,
            folder_token: args.folder_token,
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
