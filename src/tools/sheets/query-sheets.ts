import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 获取工作表列表
 */

const gridPropertiesSchema = z.object({
  frozen_row_count: z.number().optional().describe("冻结的行数量"),
  frozen_column_count: z.number().optional().describe("冻结的列数量"),
  row_count: z.number().optional().describe("工作表的行数"),
  column_count: z.number().optional().describe("工作表的列数量"),
});

const mergeRangeSchema = z.object({
  start_row_index: z.number().optional().describe("起始行，从 0 开始计数"),
  end_row_index: z.number().optional().describe("结束行，从 0 开始计数"),
  start_column_index: z.number().optional().describe("起始列，从 0 开始计数"),
  end_column_index: z.number().optional().describe("结束列，从 0 开始计数"),
});

const sheetSchema = z.object({
  sheet_id: z.string().optional().describe("工作表 ID"),
  title: z.string().optional().describe("工作表标题"),
  index: z.number().optional().describe("工作表索引位置，索引从 0 开始计数"),
  hidden: z.boolean().optional().describe("工作表是否被隐藏"),
  grid_properties: gridPropertiesSchema.optional().describe("单元格属性，仅当 resource_type 为 sheet 时返回"),
  resource_type: z.string().optional().describe("工作表类型：sheet（工作表）、bitable（多维表格）、#UNSUPPORTED_TYPE（不支持的类型）"),
  merges: z.array(mergeRangeSchema).optional().describe("合并单元格的相关信息"),
});

export const querySheets = defineTool({
  name: "query_sheets",
  description: {
    summary: "根据电子表格 token 获取表格中所有工作表及其属性信息",
    bestFor: "查询电子表格中的工作表列表，获取工作表 ID、标题、索引位置、是否隐藏、行列数、合并单元格等信息",
    notRecommendedFor: "获取电子表格基础信息请使用 get_spreadsheet，读取单元格数据请使用 read_range",
  },
  inputSchema: {
    spreadsheet_token: z.string().describe("电子表格的 token，可从电子表格 URL 中获取，如 https://sample.feishu.cn/sheets/Iow7sNNEphp3WbtnbCscPqabcef 中的 Iow7sNNEphp3WbtnbCscPqabcef"),
  },
  outputSchema: {
    sheets: z.array(sheetSchema).optional().describe("工作表列表"),
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

      const response = await context.client.sheets.v3.spreadsheetSheet.query(
        {
          path: {
            spreadsheet_token: args.spreadsheet_token,
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
