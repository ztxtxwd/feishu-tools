import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";

/**
 * API 响应接口
 */
interface CopySheetResponse {
  code: number;
  msg: string;
  data?: {
    replies?: Array<{
      copySheet?: {
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
 * 复制电子表格中的工作表
 */
export const copySheet = defineTool({
  name: "copy_sheet",
  description: {
    summary: "复制电子表格中的现有工作表，创建一个副本",
    bestFor: "基于现有工作表创建副本，保留原工作表的内容和格式",
    notRecommendedFor: "创建空白工作表请使用 add_sheet，删除工作表请使用 delete_sheet",
  },
  inputSchema: {
    spreadsheet_token: z.string().describe("电子表格的 token，可从电子表格 URL 中获取"),
    source_sheet_id: z.string().describe("要复制的源工作表 ID，可通过获取工作表接口查询"),
    title: z.string().optional().describe("新工作表的标题，不填默认为 '源工作表名称(副本_源工作表的 index 值)'"),
  },
  outputSchema: {
    replies: z.array(z.object({
      copySheet: z.object({
        properties: z.object({
          sheetId: z.string().optional().describe("复制后新工作表的 ID"),
          title: z.string().optional().describe("复制后新工作表的标题"),
          index: z.number().optional().describe("复制后新工作表的位置"),
        }).optional(),
      }).optional(),
    })).optional().describe("复制工作表的结果"),
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

    const destination: { title?: string } = {};
    if (args.title !== undefined) {
      destination.title = args.title;
    }

    const requestBody = {
      requests: [
        {
          copySheet: {
            source: {
              sheetId: args.source_sheet_id,
            },
            destination,
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

      const result = await response.json() as CopySheetResponse;

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
