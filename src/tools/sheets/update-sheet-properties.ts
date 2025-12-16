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
 * 工作表属性
 */
const sheetPropertiesSchema = z.object({
  sheetId: z.string().describe("要更新的工作表的 ID"),
  title: z.string().max(100).optional().describe("工作表的标题，长度不超过100字符，不能包含 / \\ ? * [ ] :"),
  index: z.number().int().min(0).optional().describe("工作表的位置，从 0 开始计数"),
  hidden: z.boolean().optional().describe("是否隐藏工作表"),
  frozenRowCount: z.number().int().min(0).optional().describe("冻结至指定行的行索引，0 表示取消冻结行"),
  frozenColCount: z.number().int().min(0).optional().describe("冻结至指定列的列索引，0 表示取消冻结列"),
  protect: protectSchema.optional().describe("保护工作表的属性"),
});

/**
 * API 响应数据类型
 */
interface UpdateSheetResponse {
  [key: string]: unknown;
  replies: Array<{
    updateSheet: {
      properties: z.infer<typeof sheetPropertiesSchema>;
    };
  }>;
}

/**
 * 更新工作表属性
 */
export const updateSheetProperties = defineTool({
  name: "update_sheet_properties",
  description: {
    summary: "更新电子表格中工作表的属性，支持更新标题、位置、隐藏、冻结、保护等属性。",
    bestFor: "修改工作表的标题、调整位置顺序、隐藏/显示工作表、冻结行列、设置保护",
    notRecommendedFor: "创建新工作表（请使用 create_sheet）、删除工作表（请使用 delete_sheet）",
  },
  inputSchema: {
    spreadsheetToken: z.string().describe("电子表格的 token"),
    sheetId: z.string().describe("要更新的工作表的 ID"),
    title: z.string().max(100).optional().describe("工作表的标题，长度不超过100字符"),
    index: z.number().int().min(0).optional().describe("工作表的位置，从 0 开始计数"),
    hidden: z.boolean().optional().describe("是否隐藏工作表"),
    frozenRowCount: z.number().int().min(0).optional().describe("冻结至指定行的行索引，0 表示取消冻结"),
    frozenColCount: z.number().int().min(0).optional().describe("冻结至指定列的列索引，0 表示取消冻结"),
    protect: protectSchema.optional().describe("保护工作表的属性"),
    userIdType: z.enum(["open_id", "union_id"]).optional().describe("用户 ID 类型，默认为 open_id"),
  },
  outputSchema: {
    replies: z.array(z.object({
      updateSheet: z.object({
        properties: sheetPropertiesSchema,
      }),
    })).describe("更新工作表的结果"),
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
    const properties: z.infer<typeof sheetPropertiesSchema> = {
      sheetId: args.sheetId,
    };

    if (args.title !== undefined) properties.title = args.title;
    if (args.index !== undefined) properties.index = args.index;
    if (args.hidden !== undefined) properties.hidden = args.hidden;
    if (args.frozenRowCount !== undefined) properties.frozenRowCount = args.frozenRowCount;
    if (args.frozenColCount !== undefined) properties.frozenColCount = args.frozenColCount;
    if (args.protect !== undefined) properties.protect = args.protect;

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
    let url = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${args.spreadsheetToken}/sheets_batch_update`;
    if (args.userIdType) {
      url += `?user_id_type=${args.userIdType}`;
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

      const result = await response.json() as { code: number; msg: string; data?: UpdateSheetResponse };

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
