import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";

/**
 * API 响应接口
 */
interface DeleteSheetResponse {
  code: number;
  msg: string;
  data?: {
    replies?: Array<{
      deleteSheet?: {
        result?: boolean;
        sheetId?: string;
      };
    }>;
    [key: string]: unknown;
  };
}

/**
 * 删除电子表格中的工作表
 */
export const deleteSheet = defineTool({
  name: "delete_sheet",
  description: {
    summary: "删除电子表格中的指定工作表（此操作不可撤销）",
    bestFor: "永久删除不需要的工作表，释放空间",
    notRecommendedFor: "创建工作表请使用 add_sheet，复制工作表请使用 copy_sheet",
  },
  inputSchema: {
    spreadsheet_token: z.string().describe("电子表格的 token，可从电子表格 URL 中获取"),
    sheet_id: z.string().describe("要删除的工作表 ID，可通过获取工作表接口查询"),
  },
  outputSchema: {
    replies: z.array(z.object({
      deleteSheet: z.object({
        result: z.boolean().optional().describe("删除是否成功"),
        sheetId: z.string().optional().describe("被删除的工作表 ID"),
      }).optional(),
    })).optional().describe("删除工作表的结果"),
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
          deleteSheet: {
            sheetId: args.sheet_id,
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

      const result = await response.json() as DeleteSheetResponse;

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
