import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";

/**
 * API 响应接口
 */
interface AddSheetResponse {
  code: number;
  msg: string;
  data?: {
    replies?: Array<{
      addSheet?: {
        properties?: {
          sheetId?: string;
          title?: string;
          index?: number;
        };
      };
    }>;
    [key: string]: unknown;
  };
}

/**
 * 在电子表格中新增工作表
 */
export const addSheet = defineTool({
  name: "add_sheet",
  description: {
    summary: "在电子表格中新增一个空白工作表",
    bestFor: "创建新的空白工作表，可指定标题和位置",
    notRecommendedFor: "复制现有工作表请使用 copy_sheet，删除工作表请使用 delete_sheet",
  },
  inputSchema: {
    spreadsheet_token: z.string().describe("电子表格的 token，可从电子表格 URL 中获取"),
    title: z.string().describe("新增工作表的标题"),
    index: z.number().int().min(0).optional().describe("新增工作表的位置索引，不填默认在第 0 索引位置增加工作表"),
  },
  outputSchema: {
    replies: z.array(z.object({
      addSheet: z.object({
        properties: z.object({
          sheetId: z.string().optional().describe("新增工作表的 ID"),
          title: z.string().optional().describe("新增工作表的标题"),
          index: z.number().optional().describe("新增工作表的位置"),
        }).optional(),
      }).optional(),
    })).optional().describe("新增工作表的结果"),
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

    const properties: { title: string; index?: number } = {
      title: args.title,
    };
    if (args.index !== undefined) {
      properties.index = args.index;
    }

    const requestBody = {
      requests: [
        {
          addSheet: {
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

      const result = await response.json() as AddSheetResponse;

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
