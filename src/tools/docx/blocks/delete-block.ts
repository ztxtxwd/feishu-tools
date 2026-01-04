import { z } from "zod";
import { defineTool } from "../../../define-tool.js";
import { resolveToken } from "../../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 删除单个块
 *
 * 删除飞书文档中指定的单个块。
 */
export const deleteBlock = defineTool({
  name: "delete_block",
  description: {
    summary: "删除飞书文档中指定的单个块",
    bestFor: "删除文档中的单个段落、标题、列表项等块",
    notRecommendedFor:
      "批量删除多个连续块（请使用 batch_delete_blocks）、删除表格行列（请使用 update_block）",
  },
  inputSchema: {
    document_id: z
      .string()
      .describe(
        "文档的唯一标识。可通过文档 URL 或获取文件夹下文件清单接口获取"
      ),
    block_id: z
      .string()
      .describe("要删除的块的唯一标识。可通过 list_document_blocks 获取"),
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

    try {
      const userAccessToken = await resolveToken(context.getUserAccessToken);
      const authOption = userAccessToken
        ? lark.withUserAccessToken(userAccessToken)
        : undefined;

      // Step 1: 使用迭代器获取文档所有块
      const blocksMap = new Map<
        string,
        { block_id: string; parent_id?: string; children?: string[] }
      >();

      for await (const page of await context.client.docx.v1.documentBlock.listWithIterator(
        {
          path: {
            document_id: args.document_id,
          },
          params: {
            page_size: 500,
            document_revision_id: -1,
          },
        },
        authOption
      )) {
        // 迭代器每次 yield 分页响应对象 { items?: [...] }，需要提取 items 数组
        if (page?.items) {
          for (const item of page.items) {
            if (item && item.block_id) {
              blocksMap.set(item.block_id, {
                block_id: item.block_id,
                parent_id: item.parent_id,
                children: item.children,
              });
            }
          }
        }
      }

      // Step 2: 找到要删除块的位置
      const targetBlock = blocksMap.get(args.block_id);
      if (!targetBlock) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: 找不到指定的块 ${args.block_id}`,
            },
          ],
          isError: true,
        };
      }

      const parentId = targetBlock.parent_id;
      if (!parentId) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: 找不到块 ${args.block_id} 的父块信息`,
            },
          ],
          isError: true,
        };
      }

      const parentBlock = blocksMap.get(parentId);
      if (!parentBlock || !parentBlock.children) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: 找不到父块 ${parentId} 或父块没有子块信息`,
            },
          ],
          isError: true,
        };
      }

      const blockIndex = parentBlock.children.indexOf(args.block_id);
      if (blockIndex === -1) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: 在父块 ${parentId} 的子块列表中找不到块 ${args.block_id}`,
            },
          ],
          isError: true,
        };
      }

      // Step 3: 调用 batchDelete 删除
      const response =
        await context.client.docx.v1.documentBlockChildren.batchDelete(
          {
            path: {
              document_id: args.document_id,
              block_id: parentId,
            },
            params: {
              document_revision_id: -1,
            },
            data: {
              start_index: blockIndex,
              end_index: blockIndex + 1,
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
                text: `应用频率限制：已超过调用频率上限。请使用指数退避算法降低调用速率后重试。\n错误码: ${response.code}\n错误信息: ${response.msg || "请求过于频繁"}`,
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
              text: `应用频率限制：已超过调用频率上限。请使用指数退避算法降低调用速率后重试。\n错误信息: ${message}`,
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
