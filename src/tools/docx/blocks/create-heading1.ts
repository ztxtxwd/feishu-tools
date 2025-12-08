import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 在飞书文档中创建一级标题块
 */
export const createHeading1Block = defineTool({
  name: "create_heading1_block",
  description:
    "在飞书文档的指定位置创建一级标题块。需要提供文档 ID、父块 ID、插入位置索引和标题文本内容。",
  inputSchema: {
    document_id: z.string().describe("飞书文档的唯一标识符"),
    block_id: z.string().describe("父块的 ID，新块将作为其子块插入"),
    index: z.number().int().min(0).describe("插入位置的索引，从 0 开始"),
    text: z.string().describe("标题的文本内容"),
  },
  callback: async (context, args) => {
    if (!context.client) {
      return {
        content: [{ type: "text" as const, text: "Error: Feishu client is required" }],
        isError: true,
      };
    }

    try {
      const response = await context.client.docx.v1.documentBlockChildren.create({
        path: {
          document_id: args.document_id,
          block_id: args.block_id,
        },
        params: {
          document_revision_id: -1,
        },
        data: {
          index: args.index,
          children: [
            {
              block_type: 3, // heading1
              heading1: {
                elements: [
                  {
                    text_run: {
                      content: args.text,
                    },
                  },
                ],
              },
            },
          ],
        },
      });

      if (response.code !== 0) {
        return {
          content: [{ type: "text" as const, text: response.msg || `API error: ${response.code}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(response.data, null, 2) }],
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
