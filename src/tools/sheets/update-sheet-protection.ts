import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import { cleanParams } from "../../utils/clean-params.js";

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
          protect?: {
            lock?: string;
            lockInfo?: string;
            userIDs?: string[];
          };
        };
      };
    }>;
    [key: string]: unknown;
  };
}

/**
 * 更新电子表格中工作表的保护设置
 */
export const updateSheetProtection = defineTool({
  name: "update_sheet_protection",
  description: {
    summary: "更新电子表格中工作表的保护设置，可以锁定或解锁工作表，并指定有编辑权限的用户",
    bestFor: "保护工作表防止误操作、设置工作表的编辑权限、取消工作表保护",
    notRecommendedFor: "修改工作表标题请使用 update_sheet_metadata，调整视图设置请使用 update_sheet_view_settings",
  },
  inputSchema: {
    spreadsheet_token: z.string().describe("电子表格的 token，可从电子表格 URL 中获取"),
    sheet_id: z.string().describe("要更新的工作表 ID，可通过获取工作表接口查询"),
    lock: z.enum(["LOCK", "UNLOCK"]).describe("是否保护工作表。LOCK: 保护，UNLOCK: 取消保护"),
    lock_info: z.string().optional().describe("保护工作表的备注信息"),
    user_ids: z.array(z.string()).optional().describe("除操作用户与所有者外，拥有保护范围编辑权限的用户 ID 列表"),
    user_id_type: z.enum(["open_id", "union_id"]).optional().describe("用户 ID 类型，设置 user_ids 时需要指定"),
  },
  outputSchema: {
    replies: z.array(z.object({
      updateSheet: z.object({
        properties: z.object({
          sheetId: z.string().optional(),
          protect: z.object({
            lock: z.string().optional(),
            lockInfo: z.string().optional(),
            userIDs: z.array(z.string()).optional(),
          }).optional(),
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

    // 构建 protect 对象
    const protect = cleanParams({
      lock: args.lock,
      lockInfo: args.lock_info,
      userIDs: args.user_ids,
    });

    const requestBody = {
      requests: [
        {
          updateSheet: {
            properties: {
              sheetId: args.sheet_id,
              protect,
            },
          },
        },
      ],
    };

    // 构建 URL
    let url = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${args.spreadsheet_token}/sheets_batch_update`;
    if (args.user_id_type) {
      url += `?user_id_type=${args.user_id_type}`;
    }

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
