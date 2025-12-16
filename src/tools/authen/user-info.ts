import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 获取当前登录用户信息
 */
export const getUserInfo = defineTool({
  name: "get_user_info",
  description: {
    summary: "获取当前登录用户的信息，包括用户名、头像、邮箱、手机号、用户 ID 等。",
    bestFor: "获取当前登录用户的基本信息",
    notRecommendedFor: "获取其他用户的信息（请使用通讯录相关接口）",
  },
  inputSchema: {},
  outputSchema: {
    name: z.string().optional().describe("用户名"),
    en_name: z.string().optional().describe("英文名"),
    avatar_url: z.string().optional().describe("头像URL"),
    avatar_thumb: z.string().optional().describe("头像缩略图URL"),
    avatar_middle: z.string().optional().describe("头像中等尺寸URL"),
    avatar_big: z.string().optional().describe("头像大尺寸URL"),
    email: z.string().optional().describe("邮箱"),
    mobile: z.string().optional().describe("电话"),
    user_id: z.string().optional().describe("用户ID"),
    open_id: z.string().optional().describe("用户Open ID"),
    union_id: z.string().optional().describe("用户Union ID"),
    tenant_key: z.string().optional().describe("租户Key"),
  },
  callback: async (context) => {
    if (!context.client) {
      return {
        content: [{ type: "text" as const, text: "Error: Feishu client is required" }],
        isError: true,
      };
    }

    const userAccessToken = await resolveToken(context.getUserAccessToken);
    if (!userAccessToken) {
      return {
        content: [{ type: "text" as const, text: "Error: User access token is required" }],
        isError: true,
      };
    }

    try {
      const response = await context.client.authen.v1.userInfo.get(
        {},
        lark.withUserAccessToken(userAccessToken)
      );

      if (response.code !== 0) {
        return {
          content: [{ type: "text" as const, text: `Failed to fetch user info: ${response.msg}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(response.data, null, 2) }],
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
