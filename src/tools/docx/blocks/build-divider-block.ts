import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * Divider Block 输出 Schema
 */
const dividerBlockOutputSchema = {
  block_type: z.literal(22).describe("块类型，Divider 块固定为 22"),
  divider: z.object({}).describe("分割线块内容，为空对象"),
};

/**
 * 构建 Divider Block 工具
 *
 * 用于构建飞书文档的分割线块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_block 等 API。
 */
export const buildDividerBlock = defineTool({
  name: "build_divider_block",
  description: {
    summary:
      "构建飞书文档的 Divider 块（分割线）数据结构。分割线用于在文档中创建水平分隔线，分隔不同内容区域。",
    bestFor: "在文档中创建视觉分隔、分隔不同章节或内容区域",
    notRecommendedFor: "需要直接操作文档时（请使用 create_block）",
  },
  inputSchema: {},
  outputSchema: dividerBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, _args) => {
    const block = {
      block_type: 22 as const,
      divider: {},
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(block, null, 2),
        },
      ],
      structuredContent: block,
    };
  },
});
