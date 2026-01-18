import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 高亮块背景色 Schema
 *
 * 1-7: 浅色系列
 * 8-13: 中色系列
 * 14-15: 灰色系列
 */
const backgroundColorSchema = z
  .number()
  .int()
  .min(1)
  .max(15)
  .describe(
    "背景色: 1=浅红, 2=浅橙, 3=浅黄, 4=浅绿, 5=浅蓝, 6=浅紫, 7=中灰, 8=中红, 9=中橙, 10=中黄, 11=中绿, 12=中蓝, 13=中紫, 14=灰色, 15=浅灰"
  );

/**
 * 边框色 Schema (1-7)
 */
const borderColorSchema = z
  .number()
  .int()
  .min(1)
  .max(7)
  .describe("边框色: 1=红, 2=橙, 3=黄, 4=绿, 5=蓝, 6=紫, 7=灰");

/**
 * 文字颜色 Schema (1-7)
 */
const textColorSchema = z
  .number()
  .int()
  .min(1)
  .max(7)
  .describe("文字颜色: 1=红, 2=橙, 3=黄, 4=绿, 5=蓝, 6=紫, 7=灰");

/**
 * Callout Block 输入 Schema
 */
const calloutBlockInputSchema = {
  emoji_id: z
    .string()
    .optional()
    .describe(
      "高亮块左侧的 emoji 图标 ID（snake_case 格式）。可使用 search_feishu_callout_emoji 工具搜索合适的 emoji ID。"
    ),
  background_color: backgroundColorSchema.optional(),
  border_color: borderColorSchema.optional(),
  text_color: textColorSchema.optional(),
};

/**
 * Callout Block 输出 Schema
 */
const calloutBlockOutputSchema = {
  block_type: z.literal(19).describe("块类型，Callout 块固定为 19"),
  callout: z
    .object({
      emoji_id: z.string().optional().describe("emoji 图标 ID"),
      background_color: z.number().optional().describe("背景色"),
      border_color: z.number().optional().describe("边框色"),
      text_color: z.number().optional().describe("文字颜色"),
    })
    .describe("高亮块内容"),
};

/**
 * 构建 Callout Block 工具
 *
 * 用于构建飞书文档的高亮块（Callout）数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_blocks 等 API。
 *
 * **重要说明**：
 * - Callout 块是一个容器块，**不能为空**，必须包含至少一个子块（如文本块、列表块等）
 * - 创建 Callout 块时，必须在 descendants 数组中同时提供 Callout 块和至少一个子块
 * - 子块需要在 Callout 块的 children 字段中引用
 */
export const buildCalloutBlock = defineTool({
  name: "build_callout_block",
  description: {
    summary:
      "构建飞书文档的 Callout 块（高亮块）数据结构。高亮块用于突出显示重要内容，支持自定义背景色、边框色、文字颜色和 emoji 图标。**注意：Callout 块必须包含至少一个子块，不能为空。**",
    bestFor:
      "创建提示框、警告框、注意事项、重要信息高亮显示、带图标的信息块",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_blocks）、创建空的 Callout 块（必须包含至少一个子块）",
  },
  inputSchema: calloutBlockInputSchema,
  outputSchema: calloutBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    // 构建 callout 对象，只包含有值的属性
    const callout: {
      emoji_id?: string;
      background_color?: number;
      border_color?: number;
      text_color?: number;
    } = {};

    if (args.emoji_id !== undefined) {
      callout.emoji_id = args.emoji_id;
    }
    if (args.background_color !== undefined) {
      callout.background_color = args.background_color;
    }
    if (args.border_color !== undefined) {
      callout.border_color = args.border_color;
    }
    if (args.text_color !== undefined) {
      callout.text_color = args.text_color;
    }

    const block = {
      block_type: 19 as const,
      callout,
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
