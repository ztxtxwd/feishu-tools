import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 文本元素样式 Schema
 */
const textElementStyleSchema = z
  .object({
    bold: z.boolean().optional().describe("加粗"),
    italic: z.boolean().optional().describe("斜体"),
    strikethrough: z.boolean().optional().describe("删除线"),
    underline: z.boolean().optional().describe("下划线"),
    inline_code: z.boolean().optional().describe("行内代码"),
    background_color: z
      .number()
      .int()
      .min(1)
      .max(15)
      .optional()
      .describe(
        "背景色：1=浅红, 2=浅橙, 3=浅黄, 4=浅绿, 5=浅蓝, 6=浅紫, 7=中灰, 8=红, 9=橙, 10=黄, 11=绿, 12=蓝, 13=紫, 14=灰, 15=浅灰"
      ),
    text_color: z
      .number()
      .int()
      .min(1)
      .max(7)
      .optional()
      .describe("字体颜色：1=红, 2=橙, 3=黄, 4=绿, 5=蓝, 6=紫, 7=灰"),
    link: z
      .object({
        url: z.string().describe("超链接 URL（需要 url_encode）"),
      })
      .optional()
      .describe("超链接"),
  })
  .describe("文本元素局部样式");

/**
 * 文本运行元素 Schema
 */
const textRunSchema = z
  .object({
    content: z
      .string()
      .describe("文本内容。使用 \\n 实现软换行（Shift+Enter 效果）"),
    text_element_style: textElementStyleSchema.optional(),
  })
  .describe("文本运行元素");

/**
 * @用户元素 Schema
 */
const mentionUserSchema = z
  .object({
    user_id: z.string().describe("用户 OpenID"),
    text_element_style: textElementStyleSchema.optional(),
  })
  .describe("@用户元素");

/**
 * @文档元素 Schema
 */
const mentionDocSchema = z
  .object({
    token: z.string().describe("云文档 token"),
    obj_type: z
      .number()
      .int()
      .describe(
        "云文档类型：1=Doc, 3=Sheet, 8=Bitable, 11=MindNote, 12=File, 15=Slide, 16=Wiki, 22=Docx"
      ),
    url: z.string().optional().describe("云文档链接（需要 url_encode）"),
    title: z.string().optional().describe("文档标题"),
    fallback_type: z
      .enum(["FallbackToLink", "FallbackToText"])
      .optional()
      .describe("无权限或已删除时的降级方式"),
    text_element_style: textElementStyleSchema.optional(),
  })
  .describe("@文档元素");

/**
 * 日期提醒元素 Schema
 */
const reminderSchema = z
  .object({
    create_user_id: z.string().describe("创建者用户 OpenID"),
    expire_time: z.string().describe("事件发生时间（毫秒级时间戳）"),
    notify_time: z.string().describe("触发通知时间（毫秒级时间戳）"),
    is_whole_day: z.boolean().optional().describe("是否为全天事件"),
    text_element_style: textElementStyleSchema.optional(),
  })
  .describe("日期提醒元素");

/**
 * 公式元素 Schema
 */
const equationSchema = z
  .object({
    content: z.string().describe("符合 KaTeX 语法的公式内容"),
    text_element_style: textElementStyleSchema.optional(),
  })
  .describe("公式元素");

/**
 * 文本元素 Schema（联合类型）
 */
const textElementSchema = z
  .object({
    text_run: textRunSchema.optional(),
    mention_user: mentionUserSchema.optional(),
    mention_doc: mentionDocSchema.optional(),
    reminder: reminderSchema.optional(),
    equation: equationSchema.optional(),
  })
  .describe("文本元素，每个元素只能包含一种类型");

/**
 * Text 块样式 Schema
 */
const textBlockStyleSchema = z
  .object({
    align: z
      .number()
      .int()
      .min(1)
      .max(3)
      .optional()
      .describe("对齐方式：1=居左（默认）, 2=居中, 3=居右"),
    folded: z.boolean().optional().describe("折叠状态（有子块时有效）"),
    background_color: z
      .enum([
        "LightGrayBackground",
        "LightRedBackground",
        "LightOrangeBackground",
        "LightYellowBackground",
        "LightGreenBackground",
        "LightBlueBackground",
        "LightPurpleBackground",
        "PaleGrayBackground",
        "DarkGrayBackground",
        "DarkRedBackground",
        "DarkOrangeBackground",
        "DarkYellowBackground",
        "DarkGreenBackground",
        "DarkBlueBackground",
        "DarkPurpleBackground",
      ])
      .optional()
      .describe("块背景色"),
    indentation_level: z
      .enum(["NoIndent", "OneLevelIndent"])
      .optional()
      .describe("首行缩进级别（Text 块专属）"),
  })
  .describe("Text 块样式");

/**
 * 输出的 Text Block Schema（原始形式，用于 outputSchema）
 */
const textBlockOutputSchema = {
  block_type: z.literal(2).describe("块类型，Text 块固定为 2"),
  text: z
    .object({
      elements: z.array(textElementSchema).describe("文本元素数组"),
      style: textBlockStyleSchema.optional(),
    })
    .describe("文本块内容"),
};

/**
 * 构建 Text Block 工具
 *
 * 用于构建飞书文档的文本块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_block 等 API。
 */
export const buildTextBlock = defineTool({
  name: "build_text_block",
  description: {
    summary:
      "构建飞书文档的 Text 块数据结构。支持富文本格式（加粗、斜体、链接等）、@用户、@文档、公式、日期提醒等元素。",
    bestFor:
      "构建要插入文档的文本块、创建带有富文本格式的内容、构建包含 @ 提及的文本",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_block）、只需要简单纯文本时",
  },
  inputSchema: {
    elements: z
      .array(textElementSchema)
      .min(1)
      .describe("文本元素数组，至少包含一个元素"),
    style: textBlockStyleSchema.optional(),
  },
  outputSchema: textBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    const block = {
      block_type: 2 as const,
      text: {
        elements: args.elements,
        ...(args.style && { style: args.style }),
      },
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

/**
 * 快捷方式：构建简单文本块
 *
 * 用于快速构建只包含纯文本的 Text 块
 */
export const buildSimpleTextBlock = defineTool({
  name: "build_simple_text_block",
  description: {
    summary:
      "快速构建简单的 Text 块。适用于只需要纯文本内容的场景，无需复杂的富文本格式。",
    bestFor: "快速创建纯文本段落、简单文本内容",
    notRecommendedFor:
      "需要富文本格式时（请使用 build_text_block）、需要 @ 提及或公式时",
  },
  inputSchema: {
    content: z.string().describe("文本内容"),
    style: textBlockStyleSchema.optional(),
  },
  outputSchema: textBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    const block = {
      block_type: 2 as const,
      text: {
        elements: [
          {
            text_run: {
              content: args.content,
            },
          },
        ],
        ...(args.style && { style: args.style }),
      },
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
