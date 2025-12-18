import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";

/**
 * API 响应接口
 */
interface UpdateSheetResponse {
  code: number;
  msg: string;
  data?: {
    replies?: Array<{
      updateSheet?: {
        properties?: {
          sheetId?: string;
          title?: string;
          index?: number;
          hidden?: boolean;
          frozenRowCount?: number;
          frozenColCount?: number;
        };
      };
    }>;
    [key: string]: unknown;
  };
}

/**
 * 更新电子表格中工作表的视图设置
 */
export const updateSheetViewSettings = defineTool({
  name: "update_sheet_view_settings",
  description: {
    summary: "更新电子表格中工作表的视图设置，包括位置、隐藏状态和冻结行列",
    bestFor: "调整工作表在表格中的位置、隐藏/显示工作表、设置冻结行列以固定表头",
    notRecommendedFor: "修改工作表标题请使用 update_sheet_metadata，设置保护请使用 update_sheet_protection",
  },
  inputSchema: {
    spreadsheet_token: z.string().describe("电子表格的 token，可从电子表格 URL 中获取"),
    sheet_id: z.string().describe("要更新的工作表 ID，可通过获取工作表接口查询"),
    index: z.number().int().min(0).optional().describe("工作表位置，从 0 开始计数"),
    hidden: z.boolean().optional().describe("是否隐藏工作表"),
    frozen_row_count: z.number().int().min(0).optional().describe("冻结至指定行的行索引，若填 3 表示从第一行冻结至第三行，0 表示取消冻结"),
    frozen_col_count: z.number().int().min(0).optional().describe("冻结至指定列的列索引，若填 3 表示从第一列冻结至第三列，0 表示取消冻结"),
  },
  outputSchema: {
    replies: z.array(z.object({
      updateSheet: z.object({
        properties: z.object({
          sheetId: z.string().optional(),
          index: z.number().optional(),
          hidden: z.boolean().optional(),
          frozenRowCount: z.number().optional(),
          frozenColCount: z.number().optional(),
        }).optional(),
      }).optional(),
    })).optional().describe("更新工作表的结果"),
  },
  callback: async (context, args) => {
    const userAccessToken = await resolveToken(context.getUserAccessToken);
    const tenantAccessToken = await resolveToken(context.getTenantAccessToken);
    const token = userAccessToken || tenantAccessToken;

    if (!token) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Access token is required (user_access_token or tenant_access_token)" }) }],
        isError: true,
      };
    }

    // 检查是否至少提供了一个可更新的属性
    if (args.index === undefined && args.hidden === undefined && args.frozen_row_count === undefined && args.frozen_col_count === undefined) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "至少需要提供一个要更新的属性：index、hidden、frozen_row_count 或 frozen_col_count" }) }],
        isError: true,
      };
    }

    // 构建 properties 对象
    const properties: Record<string, unknown> = {
      sheetId: args.sheet_id,
    };

    if (args.index !== undefined) {
      properties.index = args.index;
    }
    if (args.hidden !== undefined) {
      properties.hidden = args.hidden;
    }
    if (args.frozen_row_count !== undefined) {
      properties.frozenRowCount = args.frozen_row_count;
    }
    if (args.frozen_col_count !== undefined) {
      properties.frozenColCount = args.frozen_col_count;
    }

    const requestBody = {
      requests: [
        {
          updateSheet: {
            properties,
          },
        },
      ],
    };

    const url = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${args.spreadsheet_token}/sheets_batch_update`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json() as UpdateSheetResponse;

      if (result.code !== 0) {
        if (result.code === 99991400) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: "应用频率限制：已超过每秒 100 次的调用上限。请使用指数退避算法降低调用速率后重试。", code: result.code, msg: result.msg || "请求过于频繁" }) }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: result.msg, code: result.code }) }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }],
        structuredContent: result.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("99991400") || message.includes("rate limit") || message.includes("频率限制")) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "应用频率限制：已超过每秒 100 次的调用上限。请使用指数退避算法降低调用速率后重试。", message }) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  },
});
