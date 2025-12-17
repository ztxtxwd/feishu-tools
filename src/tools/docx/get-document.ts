import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 文档展示设置 Schema
 */
const documentDisplaySettingSchema = z
  .object({
    show_authors: z.boolean().optional().describe("文档信息中是否展示文档作者"),
    show_create_time: z
      .boolean()
      .optional()
      .describe("文档信息中是否展示文档创建时间"),
    show_pv: z.boolean().optional().describe("文档信息中是否展示文档访问次数"),
    show_uv: z.boolean().optional().describe("文档信息中是否展示文档访问人数"),
    show_like_count: z
      .boolean()
      .optional()
      .describe("文档信息中是否展示点赞总数"),
    show_comment_count: z
      .boolean()
      .optional()
      .describe("文档信息中是否展示评论总数"),
    show_related_matters: z
      .boolean()
      .optional()
      .describe("文档信息中是否展示关联事项（暂未支持）"),
  })
  .describe("文档展示设置");

/**
 * 文档封面 Schema
 */
const documentCoverSchema = z
  .object({
    token: z.string().describe("封面图片 token"),
    offset_ratio_x: z
      .number()
      .optional()
      .describe("视图在水平方向的偏移比例"),
    offset_ratio_y: z
      .number()
      .optional()
      .describe("视图在垂直方向的偏移比例"),
  })
  .describe("文档封面");

/**
 * 文档信息 Schema
 */
const documentSchema = z
  .object({
    document_id: z.string().describe("文档的唯一标识"),
    revision_id: z.number().describe("文档版本 ID，起始值为 1"),
    title: z.string().optional().describe("文档标题"),
    display_setting: documentDisplaySettingSchema.optional(),
    cover: documentCoverSchema.optional(),
  })
  .describe("文档信息");

/**
 * 获取飞书文档基本信息
 */
export const getDocument = defineTool({
  name: "get_document",
  description: {
    summary: "获取飞书文档的基本信息，包括文档标题、版本 ID、封面和展示设置。",
    bestFor: "获取文档的元数据信息，如标题、版本号等",
    notRecommendedFor: "获取文档内容（请使用获取文档所有块接口）",
  },
  inputSchema: {
    document_id: z
      .string()
      .length(27)
      .describe(
        "文档的唯一标识。可通过文档 URL 或获取文件夹下文件清单接口获取。对于知识库中的文档，需通过知识库接口获取 obj_token"
      ),
  },
  outputSchema: {
    document: documentSchema.describe("文档信息"),
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

      const response = await context.client.docx.v1.document.get(
        {
          path: {
            document_id: args.document_id,
          },
        },
        userAccessToken ? lark.withUserAccessToken(userAccessToken) : undefined
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
});
