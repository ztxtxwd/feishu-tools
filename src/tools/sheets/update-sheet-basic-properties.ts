import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";

/**
 * API 响应数据类型
 */
interface UpdateSheetBasicPropertiesResponse {
  [key: string]: unknown;
  replies: Array<{
    updateSheet: {
      properties: {
        sheetId: string;
        title?: string;
        index?: number;
        hidden?: boolean;
      };
    };
  }>;
}

/**
 * 更新工作表基本属性
 */
export const updateSheetBasicProperties = defineTool({
  name: "update_sheet_basic_properties",
  description: {
    summary: "更新电子表格中工作表的基本属性，包括标题、位置和隐藏状态。",
    bestFor: "修改工作表标题、调整工作表在工作簿中的位置顺序、隐藏或显示工作表",
    notRecommendedFor: "冻结行列（请使用 update_sheet_frozen_panes）、设置工作表保护（请使用 update_sheet_protection）",
  },
  inputSchema: {
    spreadsheetToken: z.string().describe("电子表格的 token"),
    sheetId: z.string().describe("要更新的工作表的 ID"),
    title: z.string()
      .max(100)
      .regex(/^[^/\\?*\[\]:]*$/, "标题不能包含特殊字符 / \\ ? * [ ] :")
      .optional()
      .describe("工作表的标题，长度不超过100字符，不能包含特殊字符"),
    index: z.number().int().min(0).optional().describe("工作表的位置，从 0 开始计数"),
    hidden: z.boolean().optional().describe("是否隐藏工作表，默认为 false"),
    userIdType: z.enum(["open_id", "union_id", "lark_id"]).optional().describe("用户 ID 类型，默认为 lark_id"),
  },
  outputSchema: {
    replies: z.array(z.object({
      updateSheet: z.object({
        properties: z.object({
          sheetId: z.string(),
          title: z.string().optional(),
          index: z.number().optional(),
          hidden: z.boolean().optional(),
        }),
      }),
    })).describe("更新工作表基本属性的结果"),
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

    // 检查是否至少提供了一个要更新的属性
    if (args.title === undefined && args.index === undefined && args.hidden === undefined) {
      return {
        content: [{ type: "text" as const, text: "Error: At least one of title, index, or hidden must be provided" }],
        isError: true,
      };
    }

    // 构建 properties 对象，只包含提供的字段
    const properties: Record<string, unknown> = {
      sheetId: args.sheetId,
    };

    if (args.title !== undefined) properties.title = args.title;
    if (args.index !== undefined) properties.index = args.index;
    if (args.hidden !== undefined) properties.hidden = args.hidden;

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

      const result = await response.json() as { code: number; msg: string; data?: UpdateSheetBasicPropertiesResponse };

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