import { z } from "zod";
import { defineTool } from "../../../define-tool.js";
import { resolveToken } from "../../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 文本局部样式 Schema
 */
const textElementStyleSchema = z
  .object({
    bold: z.boolean().optional().describe("加粗"),
    italic: z.boolean().optional().describe("斜体"),
    strikethrough: z.boolean().optional().describe("删除线"),
    underline: z.boolean().optional().describe("下划线"),
    inline_code: z.boolean().optional().describe("inline 代码"),
    background_color: z.number().int().optional().describe("背景色"),
    text_color: z.number().int().optional().describe("字体颜色"),
    link: z
      .object({
        url: z.string().describe("超链接指向的 url"),
      })
      .optional()
      .describe("链接"),
    comment_ids: z.array(z.string()).optional().describe("评论 ID 列表"),
  })
  .describe("文本局部样式");

/**
 * 文本样式 Schema
 */
const textStyleSchema = z
  .object({
    align: z.number().int().optional().describe("对齐方式"),
    done: z.boolean().optional().describe("todo 的完成状态"),
    folded: z.boolean().optional().describe("文本的折叠状态"),
    language: z.number().int().optional().describe("代码块的语言类型"),
    wrap: z.boolean().optional().describe("代码块是否自动换行"),
    background_color: z.string().optional().describe("块的背景色"),
    indentation_level: z.string().optional().describe("首行缩进级别"),
    sequence: z.string().optional().describe("有序列表项编号"),
  })
  .describe("文本样式");

/**
 * 文本元素 Schema
 */
const textElementSchema = z
  .object({
    text_run: z
      .object({
        content: z.string().describe("文本内容"),
        text_element_style: textElementStyleSchema.optional(),
      })
      .optional()
      .describe("文字"),
    mention_user: z
      .object({
        user_id: z.string().describe("用户 ID"),
        text_element_style: textElementStyleSchema.optional(),
      })
      .optional()
      .describe("@用户"),
    mention_doc: z
      .object({
        token: z.string().describe("云文档 token"),
        obj_type: z.number().int().describe("云文档类型"),
        url: z.string().describe("云文档链接"),
        title: z.string().describe("文档标题"),
        text_element_style: textElementStyleSchema.optional(),
      })
      .optional()
      .describe("@文档"),
  })
  .describe("文本元素");

/**
 * Block Schema
 */
const blockSchema = z
  .object({
    block_id: z.string().describe("子块的唯一标识"),
    parent_id: z.string().describe("子块的父块 ID"),
    children: z.array(z.string()).optional().describe("子块的子块 ID 列表"),
    block_type: z.number().int().describe("Block 类型"),
    page: z
      .object({
        style: textStyleSchema.optional(),
        elements: z.array(textElementSchema).optional(),
      })
      .optional()
      .describe("文档的根 Block"),
    text: z
      .object({
        style: textStyleSchema.optional(),
        elements: z.array(textElementSchema).optional(),
      })
      .optional()
      .describe("文本块"),
  })
  .describe("Block 信息");

/**
 * 列出文档所有块
 */
export const listDocumentBlocks = defineTool({
  name: "list_document_blocks",
  description: {
    summary:
      "获取文档所有块的富文本内容。支持获取文档的所有文本、标题、列表、代码块等内容块。默认使用迭代器自动获取所有块，也可手动分页。",
    bestFor:
      "读取文档的完整结构和内容、遍历文档所有块、导出文档内容",
    notRecommendedFor:
      "只需要文档基本信息时（请使用 get_document）、只需要纯文本内容时（请使用 get_document_raw_content）",
  },
  inputSchema: {
    document_id: z
      .string()
      .describe(
        "文档的唯一标识。可通过文档 URL 或获取文件夹下文件清单接口获取"
      ),
    page_size: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("分页大小，默认 500。填写时将进入分页模式"),
    page_token: z
      .string()
      .optional()
      .describe(
        "分页标记。与 page_size 均不填时使用迭代器自动获取所有块；填写其中任意一个则进入分页模式"
      ),
    document_revision_id: z
      .number()
      .int()
      .optional()
      .describe(
        "查询的文档版本，-1 表示文档最新版本。文档创建后，版本为 1。若查询历史版本，需要持有文档的编辑权限"
      ),
    user_id_type: z
      .enum(["open_id", "union_id", "user_id"])
      .optional()
      .describe("用户 ID 类型，默认为 open_id"),
  },
  outputSchema: {
    items: z.array(blockSchema).describe("文档的 Block 列表"),
    page_token: z.string().optional().describe("分页标记，仅在手动分页时返回"),
    has_more: z.boolean().optional().describe("是否还有更多项，仅在手动分页时返回"),
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

      // 如果提供了 page_token 或 page_size，使用手动分页模式
      if (args.page_token !== undefined || args.page_size !== undefined) {
        const response = await context.client.docx.v1.documentBlock.list(
          {
            path: {
              document_id: args.document_id,
            },
            params: {
              page_size: args.page_size ?? 500,
              ...(args.page_token && { page_token: args.page_token }),
              document_revision_id: args.document_revision_id ?? -1,
              user_id_type: args.user_id_type,
            },
          },
          authOption
        );

        if (response.code !== 0) {
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
      }

      // 否则使用迭代器模式自动获取所有块
      const allBlocks: unknown[] = [];

      for await (const item of await context.client.docx.v1.documentBlock.listWithIterator(
        {
          path: {
            document_id: args.document_id,
          },
          params: {
            page_size: args.page_size ?? 500,
            document_revision_id: args.document_revision_id ?? -1,
            user_id_type: args.user_id_type,
          },
        },
        authOption
      )) {
        allBlocks.push(item);
      }

      const result = { items: allBlocks };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
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
