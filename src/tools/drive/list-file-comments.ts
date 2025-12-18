import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import { cleanParams } from "../../utils/clean-params.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 回复内容元素 Schema
 */
const replyElementSchema = z.object({
  type: z.string().optional().describe("回复的内容元素类型：text_run（普通文本）、docs_link（云文档链接）、person（@联系人）"),
  text_run: z.object({
    text: z.string().optional().describe("普通文本内容"),
  }).optional().describe("文本内容"),
  docs_link: z.object({
    url: z.string().optional().describe("云文档链接 URL"),
  }).optional().describe("云文档链接"),
  person: z.object({
    user_id: z.string().optional().describe("用户 ID"),
  }).optional().describe("@用户"),
});

/**
 * 回复内容 Schema
 */
const replyContentSchema = z.object({
  elements: z.array(replyElementSchema).optional().describe("回复的内容元素列表"),
});

/**
 * 回复额外信息 Schema
 */
const replyExtraSchema = z.object({
  image_list: z.array(z.string()).optional().describe("评论中的图片 Token 列表"),
});

/**
 * 回复 Schema
 */
const replySchema = z.object({
  reply_id: z.string().optional().describe("回复 ID"),
  user_id: z.string().optional().describe("用户 ID"),
  create_time: z.number().optional().describe("创建时间"),
  update_time: z.number().optional().describe("更新时间"),
  content: replyContentSchema.optional().describe("回复内容"),
  extra: replyExtraSchema.optional().describe("回复的其他内容"),
});

/**
 * 回复列表 Schema
 */
const replyListSchema = z.object({
  replies: z.array(replySchema).optional().describe("回复列表"),
});

/**
 * 评论 Schema
 */
const fileCommentSchema = z.object({
  comment_id: z.string().optional().describe("评论 ID"),
  user_id: z.string().optional().describe("用户 ID"),
  create_time: z.number().optional().describe("创建时间"),
  update_time: z.number().optional().describe("更新时间"),
  is_solved: z.boolean().optional().describe("是否已解决"),
  solved_time: z.number().optional().describe("解决评论时间"),
  solver_user_id: z.string().optional().describe("解决评论者的用户 ID"),
  has_more: z.boolean().optional().describe("是否有更多回复"),
  page_token: z.string().optional().describe("回复分页标记"),
  is_whole: z.boolean().optional().describe("是否是全文评论"),
  quote: z.string().optional().describe("局部评论的引用字段"),
  reply_list: replyListSchema.optional().describe("评论里的回复列表"),
});

/**
 * 获取云文档所有评论
 */
export const listFileComments = defineTool({
  name: "list_file_comments",
  description: {
    summary: "获取云文档所有评论信息，包括评论和回复 ID、回复的内容、评论人和回复人的用户 ID 等。支持返回全局评论以及局部评论。",
    bestFor: "查看云文档的所有评论、筛选已解决或未解决的评论、获取评论内容和回复",
    notRecommendedFor: "创建评论请使用其他接口",
  },
  inputSchema: {
    file_token: z.string().describe("云文档的 token。可从文档 URL 中获取"),
    file_type: z.enum(["doc", "docx", "sheet", "file", "slides"]).describe("云文档类型：doc（旧版文档，不推荐）、docx（新版文档）、sheet（电子表格）、file（文件）、slides（幻灯片）"),
    is_whole: z.boolean().optional().describe("是否全文评论"),
    is_solved: z.boolean().optional().describe("是否已解决"),
    page_token: z.string().optional().describe("分页标记，第一次请求不填，表示从头开始遍历"),
    page_size: z.number().int().min(1).max(100).optional().describe("分页大小，默认 50，最大 100"),
    user_id_type: z.enum(["open_id", "union_id", "user_id"]).optional().describe("用户 ID 类型，默认为 open_id"),
  },
  outputSchema: {
    has_more: z.boolean().optional().describe("是否还有更多项"),
    page_token: z.string().optional().describe("分页标记"),
    items: z.array(fileCommentSchema).optional().describe("评论列表"),
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

      const response = await context.client.drive.v1.fileComment.list(
        {
          path: {
            file_token: args.file_token,
          },
          params: {
            file_type: args.file_type,
            ...cleanParams({
              is_whole: args.is_whole,
              is_solved: args.is_solved,
              page_token: args.page_token,
              page_size: args.page_size,
              user_id_type: args.user_id_type,
            }),
          },
        },
        userAccessToken ? lark.withUserAccessToken(userAccessToken) : undefined
      );

      if (response.code !== 0) {
        if (response.code === 99991400) {
          return {
            content: [
              {
                type: "text" as const,
                text: `应用频率限制：已超过调用频率上限（1000 次/分钟、50 次/秒）。请使用指数退避算法降低调用速率后重试。\n错误码: ${response.code}\n错误信息: ${response.msg || "请求过于频繁"}`,
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
          { type: "text" as const, text: JSON.stringify(response.data, null, 2) },
        ],
        structuredContent: response.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("99991400") || message.includes("rate limit") || message.includes("频率限制")) {
        return {
          content: [
            {
              type: "text" as const,
              text: `应用频率限制：已超过调用频率上限（1000 次/分钟、50 次/秒）。请使用指数退避算法降低调用速率后重试。\n错误信息: ${message}`,
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
