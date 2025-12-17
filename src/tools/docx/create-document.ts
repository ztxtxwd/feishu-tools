import { z } from "zod";
import { defineTool } from "../../define-tool.js";
import { resolveToken } from "../../utils/token.js";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 创建飞书文档
 */
export const createDocument = defineTool({
  name: "create_document",
  description: {
    summary: "创建文档类型为 docx 的飞书文档，可指定文档标题和所在文件夹。",
    bestFor: "创建新的飞书文档",
    notRecommendedFor: "带内容创建文档（请先创建文档再添加内容），基于模板创建文档（请使用复制文件接口）",
  },
  inputSchema: {
    folder_token: z
      .string()
      .optional()
      .describe(
        "文档所在文件夹的 Token。不传或传空表示根目录。若使用 tenant_access_token，仅可指定应用创建的文件夹"
      ),
    title: z
      .string()
      .min(1)
      .max(800)
      .optional()
      .describe("文档标题，只支持纯文本，长度范围 1-800 字符"),
  },
  outputSchema: {
    document: z.object({
      document_id: z.string().describe("文档的唯一标识"),
      revision_id: z.number().describe("文档版本 ID"),
      title: z.string().optional().describe("文档标题"),
    }).describe("新建文档的文档信息"),
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

      const response = await context.client.docx.v1.document.create(
        {
          data: {
            folder_token: args.folder_token,
            title: args.title,
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
          { type: "text" as const, text: JSON.stringify(response.data, null, 2) },
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
