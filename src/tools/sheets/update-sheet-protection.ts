import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";

/**
 * 保护工作表的属性
 */
const protectSchema = z.object({
  lock: z.enum(["LOCK", "UNLOCK"]).describe("是否保护工作表。LOCK: 保护, UNLOCK: 取消保护"),
  lockInfo: z.string().optional().describe("保护工作表的备注信息"),
  userIDs: z.array(z.string()).optional().describe("除操作用户与所有者外，其他拥有保护范围编辑权限的用户 ID"),
});

/**
 * API 响应数据类型
 */
interface UpdateSheetProtectionResponse {
  [key: string]: unknown;
  replies: Array<{
    updateSheet: {
      properties: {
        sheetId: string;
        protect: z.infer<typeof protectSchema>;
      };
    };
  }>;
}

/**
 * 更新工作表保护设置
 */
export const updateSheetProtection = defineTool({
  name: "update_sheet_protection",
  description: {
    summary: "更新电子表格中工作表的保护设置，支持锁定/解锁工作表、设置保护备注和授权特定用户编辑权限。",
    bestFor: "保护工作表防止意外修改、为特定用户授予编辑权限、设置保护说明",
    notRecommendedFor: "修改工作表标题或位置（请使用 update_sheet_basic_properties）、冻结行列（请使用 update_sheet_frozen_panes）",
  },
  inputSchema: {
    spreadsheetToken: z.string().describe("电子表格的 token"),
    sheetId: z.string().describe("要更新的工作表的 ID"),
    protect: protectSchema.describe("保护工作表的属性"),
    userIdType: z.enum(["open_id", "union_id", "lark_id"]).optional().describe("用户 ID 类型，默认为 lark_id"),
  },
  outputSchema: {
    replies: z.array(z.object({
      updateSheet: z.object({
        properties: z.object({
          sheetId: z.string(),
          protect: protectSchema,
        }),
      }),
    })).describe("更新工作表保护设置的结果"),
  },
  callback: async (context, args) => {
    // 优先使用 UAT，其次使用 TAT
    const userAccessToken = await resolveToken(context.getUserAccessToken);
    const tenantAccessToken = await resolveToken(context.getTenantAccessToken);
    const token = userAccessToken || tenantAccessToken;

    if (!token) {
      return {
        content: [{ type: "text" as const, text: "Error: Access token is required (user_access_token or tenant_access_token)" }],
        isError: true,
      };
    }

    // 构建 properties 对象
    const properties = {
      sheetId: args.sheetId,
      protect: args.protect,
    };

    // 构建请求体
    const requestBody = {
      requests: [
        {
          updateSheet: {
            properties,
          },
        },
      ],
    };

    // 构建 URL
    let url = `https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/${args.spreadsheetToken}/sheets_batch_update`;
    const queryParams = new URLSearchParams();
    if (args.userIdType) {
      queryParams.append("user_id_type", args.userIdType);
    }
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
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

      const result = await response.json() as { code: number; msg: string; data?: UpdateSheetProtectionResponse };

      // 处理频率限制错误
      if (result.code === 99991663 || result.msg?.includes("rate limit")) {
        return {
          content: [{ type: "text" as const, text: `Error: API rate limit exceeded. Please try again later. (code: ${result.code})` }],
          isError: true,
        };
      }

      if (result.code !== 0) {
        return {
          content: [{ type: "text" as const, text: `Error: ${result.msg} (code: ${result.code})` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }],
        structuredContent: result.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
});