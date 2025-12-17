import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";

/**
 * API 响应数据类型
 */
interface UpdateSheetFrozenPanesResponse {
  [key: string]: unknown;
  replies: Array<{
    updateSheet: {
      properties: {
        sheetId: string;
        frozenRowCount?: number;
        frozenColCount?: number;
      };
    };
  }>;
}

/**
 * 更新工作表冻结窗格
 */
export const updateSheetFrozenPanes = defineTool({
  name: "update_sheet_frozen_panes",
  description: {
    summary: "更新电子表格中工作表的冻结窗格设置，支持冻结行和冻结列。",
    bestFor: "冻结工作表的顶部行或左侧列，方便查看大量数据时保持表头可见",
    notRecommendedFor: "修改工作表标题或位置（请使用 update_sheet_basic_properties）、设置工作表保护（请使用 update_sheet_protection）",
  },
  inputSchema: {
    spreadsheetToken: z.string().describe("电子表格的 token"),
    sheetId: z.string().describe("要更新的工作表的 ID"),
    frozenRowCount: z.number().int().min(0).optional().describe("冻结至指定行的行索引。若填 3，表示从第一行冻结至第三行。0 表示取消冻结行"),
    frozenColCount: z.number().int().min(0).optional().describe("冻结至指定列的列索引。若填 3，表示从第一列冻结至第三列。0 表示取消冻结列"),
    userIdType: z.enum(["open_id", "union_id", "lark_id"]).optional().describe("用户 ID 类型，默认为 lark_id"),
  },
  outputSchema: {
    replies: z.array(z.object({
      updateSheet: z.object({
        properties: z.object({
          sheetId: z.string(),
          frozenRowCount: z.number().optional(),
          frozenColCount: z.number().optional(),
        }),
      }),
    })).describe("更新工作表冻结窗格的结果"),
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

    // 检查是否至少提供了一个冻结参数
    if (args.frozenRowCount === undefined && args.frozenColCount === undefined) {
      return {
        content: [{ type: "text" as const, text: "Error: At least one of frozenRowCount or frozenColCount must be provided" }],
        isError: true,
      };
    }

    // 构建 properties 对象，只包含提供的字段
    const properties: Record<string, unknown> = {
      sheetId: args.sheetId,
    };

    if (args.frozenRowCount !== undefined) properties.frozenRowCount = args.frozenRowCount;
    if (args.frozenColCount !== undefined) properties.frozenColCount = args.frozenColCount;

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

      const result = await response.json() as { code: number; msg: string; data?: UpdateSheetFrozenPanesResponse };

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