import { z } from "zod";
import { defineTool } from "../../../define-tool.js";
import { resolveToken } from "../../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 批量删除块
 *
 * 指定需要操作的块，删除其指定范围的子块。
 * 删除操作使用左闭右开区间 [start_index, end_index)
 */
export const batchDeleteBlocks = defineTool({
  name: "batch_delete_blocks",
  description: {
    summary:
      "删除指定块的子块。通过指定起始索引和结束索引（左闭右开区间），批量删除父块下的一段连续子块。操作成功后返回文档的新版本号。",
    bestFor:
      "批量删除文档中的连续内容块、清理文档中的某一部分内容、删除多个连续段落或列表项",
    notRecommendedFor:
      "删除表格的行列（请使用 update_block）、删除分栏列（请使用 update_block）、删除非连续的多个块",
  },
  inputSchema: {
    document_id: z
      .string()
      .describe(
        "文档的唯一标识。可通过文档 URL 或获取文件夹下文件清单接口获取"
      ),
    block_id: z
      .string()
      .describe(
        "父块的唯一标识。要删除的子块必须是该父块的直接子块。可通过 list_document_blocks 获取"
      ),
    start_index: z
      .number()
      .int()
      .min(0)
      .describe(
        "删除的起始索引（从 0 开始），操作区间左闭右开。例如要删除第 1 个子块，start_index 应为 0"
      ),
    end_index: z
      .number()
      .int()
      .min(1)
      .describe(
        "删除的结束索引（不包含），操作区间左闭右开。例如要删除第 1 和第 2 个子块，start_index=0, end_index=2"
      ),
    document_revision_id: z
      .number()
      .int()
      .min(-1)
      .optional()
      .describe(
        "要操作的文档版本，-1 表示文档最新版本。文档创建后版本为 1。默认为 -1"
      ),
    client_token: z
      .string()
      .optional()
      .describe(
        "操作的唯一标识，用于幂等操作。如果提供相同的 client_token，重复请求不会重复执行删除"
      ),
  },
  outputSchema: {
    document_revision_id: z
      .number()
      .describe("删除操作成功后文档的新版本号"),
    client_token: z
      .string()
      .describe("操作的唯一标识，可用于后续幂等请求"),
  },
  callback: async (context, args) => {
    if (!context.client) {
      return {
        content: [
          { type: "text" as const, text: "Error: Feishu client is required" },
        ],
        isError: true,
      };
    }

    // 验证 start_index < end_index
    if (args.start_index >= args.end_index) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: start_index 必须小于 end_index",
          },
        ],
        isError: true,
      };
    }

    try {
      const userAccessToken = await resolveToken(context.getUserAccessToken);
      const authOption = userAccessToken
        ? lark.withUserAccessToken(userAccessToken)
        : undefined;

      const response =
        await context.client.docx.v1.documentBlockChildren.batchDelete(
          {
            path: {
              document_id: args.document_id,
              block_id: args.block_id,
            },
            params: {
              document_revision_id: args.document_revision_id ?? -1,
              ...(args.client_token && { client_token: args.client_token }),
            },
            data: {
              start_index: args.start_index,
              end_index: args.end_index,
            },
          },
          authOption
        );

      if (response.code !== 0) {
        // 处理频率限制错误
        if (response.code === 99991400) {
          return {
            content: [
              {
                type: "text" as const,
                text: `应用频率限制：已超过每秒 3 次的调用上限。请使用指数退避算法降低调用速率后重试。\n错误码: ${response.code}\n错误信息: ${response.msg || "请求过于频繁"}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: response.msg || `API error: ${response.code}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2),
          },
        ],
        structuredContent: response.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // 检查错误信息中是否包含频率限制错误码
      if (
        message.includes("99991400") ||
        message.includes("rate limit") ||
        message.includes("频率限制")
      ) {
        return {
          content: [
            {
              type: "text" as const,
              text: `应用频率限制：已超过每秒 3 次的调用上限。请使用指数退避算法降低调用速率后重试。\n错误信息: ${message}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
});
