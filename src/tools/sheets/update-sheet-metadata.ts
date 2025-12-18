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
 * 更新电子表格中工作表的元数据（标题）
 */
export const updateSheetMetadata = defineTool({
  name: "update_sheet_metadata",
  description: {
    summary: "更新电子表格中工作表的元数据，目前支持修改工作表标题",
    bestFor: "重命名工作表",
    notRecommendedFor: "调整工作表位置、冻结设置或保护设置，请使用 update_sheet_view_settings 或 update_sheet_protection",
  },
  inputSchema: {
    spreadsheet_token: z.string().describe("电子表格的 token，可从电子表格 URL 中获取"),
    sheet_id: z.string().describe("要更新的工作表 ID，可通过获取工作表接口查询"),
    title: z.string().max(100).describe("工作表标题，不超过 100 字符，不能包含 / \\ ? * [ ] : 等特殊字符"),
  },
  outputSchema: {
    replies: z.array(z.object({
      updateSheet: z.object({
        properties: z.object({
          sheetId: z.string().optional(),
          title: z.string().optional(),
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

    const requestBody = {
      requests: [
        {
          updateSheet: {
            properties: {
              sheetId: args.sheet_id,
              title: args.title,
            },
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
