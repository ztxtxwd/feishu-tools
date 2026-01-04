import { z } from "zod";
import { defineTool } from "../../../define-tool.js";
import { resolveToken } from "../../../utils/token.js";
import { cleanParams } from "../../../utils/clean-params.js";
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
  .looseObject({
    block_id: z.string().optional().describe("子块的唯一标识"),
    parent_id: z.string().optional().describe("子块的父块 ID"),
    children: z.array(z.string()).optional().describe("子块的子块 ID 列表"),
    block_type: z.number().int().optional().describe("Block 类型"),
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
 * 列出文档所有块或指定块的所有子孙块
 */
export const listDocumentBlocks = defineTool({
  name: "list_document_blocks",
  description:
    "获取文档所有块或指定块的所有子孙块的富文本内容。不提供 block_id 时获取整个文档的所有块，提供 block_id 时获取该块的所有子孙块。",
  inputSchema: {
    document_id: z.string().describe("文档的唯一标识"),
    block_id: z
      .string()
      .optional()
      .describe("Block 的唯一标识。不填时获取整个文档的所有块，填写时获取该块的所有子孙块"),
    document_revision_id: z
      .number()
      .int()
      .optional()
      .describe("查询的文档版本，-1 表示文档最新版本"),
    user_id_type: z
      .enum(["open_id", "union_id", "user_id"])
      .optional()
      .describe("用户 ID 类型，默认为 open_id"),
  },
  outputSchema: {
    items: z.array(blockSchema).describe("文档的 Block 列表"),
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

      const allBlocks: unknown[] = [];

      // 使用 documentBlockChildren.getWithIterator 获取所有块
      for await (const page of await context.client.docx.v1.documentBlockChildren.getWithIterator(
        {
          path: {
            document_id: args.document_id,
            block_id: args.block_id ?? args.document_id,
          },
          params: cleanParams({
            document_revision_id: args.document_revision_id,
            user_id_type: args.user_id_type,
            with_descendants: true,
          }),
        },
        authOption
      )) {
        if (page?.items) {
          allBlocks.push(...page.items);
        }
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

      if (message.includes('99991400') || message.includes('rate limit') || message.includes('频率限制')) {
        return {
          content: [
            {
              type: "text" as const,
              text: `应用频率限制：已超过每秒 5 次的调用上限。请使用指数退避算法降低调用速率后重试。\n错误信息: ${message}`,
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
