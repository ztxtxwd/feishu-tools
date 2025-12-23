import { z } from "zod";

/**
 * 块背景色枚举
 */
export const BlockBackgroundColor = z.enum([
  "LightGrayBackground", // 浅灰色
  "LightRedBackground", // 浅红色
  "LightOrangeBackground", // 浅橙色
  "LightYellowBackground", // 浅黄色
  "LightGreenBackground", // 浅绿色
  "LightBlueBackground", // 浅蓝色
  "LightPurpleBackground", // 浅紫色
  "PaleGrayBackground", // 中灰色
  "DarkGrayBackground", // 灰色
  "DarkRedBackground", // 中红色
  "DarkOrangeBackground", // 中橙色
  "DarkYellowBackground", // 中黄色
  "DarkGreenBackground", // 中绿色
  "DarkBlueBackground", // 中蓝色
  "DarkPurpleBackground", // 中紫色
]);

/**
 * 对齐方式枚举
 */
export const AlignType = z.enum(["1", "2", "3"]).transform((val) => {
  const num = parseInt(val);
  if (num === 1) return 1; // 居左
  if (num === 2) return 2; // 居中
  if (num === 3) return 3; // 居右
  return 1; // 默认居左
});

/**
 * 对齐方式（数字形式）
 */
export const AlignNumber = z
  .number()
  .int()
  .min(1)
  .max(3)
  .describe("对齐方式：1=居左，2=居中，3=居右");

/**
 * 缩进级别枚举
 */
export const IndentationLevel = z.enum([
  "NoIndent", // 无缩进
  "OneLevelIndent", // 一级缩进
]);

/**
 * 代码块语言类型枚举（部分常用语言）
 */
export const CodeLanguage = z
  .number()
  .int()
  .min(1)
  .max(75)
  .describe(
    "代码块语言类型：1=PlainText, 7=Bash, 22=Go, 29=Java, 30=JavaScript, 49=Python, 53=Rust, 56=SQL, 63=TypeScript 等"
  );

/**
 * 基础块样式 Schema
 *
 * 适用于所有文本类块（Text, Heading1-9, Bullet, Ordered, Code, Quote, Todo）
 * 注意：某些属性仅在特定块类型中有效
 */
export const baseBlockStyleSchema = z
  .object({
    /**
     * 对齐方式
     * - 1: 居左排版（默认）
     * - 2: 居中排版
     * - 3: 居右排版
     *
     * 适用于：Text, Heading1-9, Bullet, Ordered, Code, Quote, Todo
     */
    align: AlignNumber.optional(),

    /**
     * todo 的完成状态
     * 仅适用于：Todo 块
     */
    done: z.boolean().optional(),

    /**
     * 文本的折叠状态
     * 适用于：
     * - Heading1~9（标题可折叠子内容）
     * - 有子块的 Text、Ordered、Bullet、Todo 块
     */
    folded: z.boolean().optional(),

    /**
     * 代码块的语言类型
     * 仅适用于：Code 块
     */
    language: CodeLanguage.optional(),

    /**
     * 代码块是否自动换行
     * 仅适用于：Code 块
     */
    wrap: z.boolean().optional(),

    /**
     * 块的背景色
     * 适用于：大部分文本类块
     */
    background_color: BlockBackgroundColor.optional(),

    /**
     * 首行缩进级别
     * 仅适用于：Text 块
     */
    indentation_level: IndentationLevel.optional(),
  })
  .describe("块样式配置");

/**
 * Text 块专用样式 Schema
 */
export const textBlockStyleSchema = z
  .object({
    align: AlignNumber.optional(),
    folded: z.boolean().optional(),
    background_color: BlockBackgroundColor.optional(),
    indentation_level: IndentationLevel.optional()
      .describe("首行缩进级别，仅 Text 块支持"),
  })
  .describe("Text 块样式配置");

/**
 * Heading 块样式 Schema
 * 适用于 Heading1-9
 */
export const headingBlockStyleSchema = z
  .object({
    align: AlignNumber.optional(),
    folded: z.boolean().optional().describe("标题的折叠状态，可折叠标题下的子内容"),
    background_color: BlockBackgroundColor.optional(),
  })
  .describe("Heading 块样式配置");

/**
 * Code 块样式 Schema
 */
export const codeBlockStyleSchema = z
  .object({
    align: AlignNumber.optional(),
    folded: z.boolean().optional(),
    background_color: BlockBackgroundColor.optional(),
    language: CodeLanguage.optional().describe("代码块的编程语言类型"),
    wrap: z.boolean().optional().describe("代码块是否自动换行"),
  })
  .describe("Code 块样式配置");

/**
 * Todo 块样式 Schema
 */
export const todoBlockStyleSchema = z
  .object({
    align: AlignNumber.optional(),
    done: z.boolean().optional().describe("待办事项的完成状态"),
    folded: z.boolean().optional(),
    background_color: BlockBackgroundColor.optional(),
  })
  .describe("Todo 块样式配置");

/**
 * Bullet/Ordered 列表块样式 Schema
 */
export const listBlockStyleSchema = z
  .object({
    align: AlignNumber.optional(),
    folded: z.boolean().optional().describe("列表项的折叠状态，仅当有子块时有效"),
    background_color: BlockBackgroundColor.optional(),
  })
  .describe("列表块样式配置");

/**
 * Quote 块样式 Schema
 */
export const quoteBlockStyleSchema = z
  .object({
    align: AlignNumber.optional(),
    folded: z.boolean().optional(),
    background_color: BlockBackgroundColor.optional(),
  })
  .describe("引用块样式配置");

// 导出类型定义
export type BaseBlockStyle = z.infer<typeof baseBlockStyleSchema>;
export type TextBlockStyle = z.infer<typeof textBlockStyleSchema>;
export type HeadingBlockStyle = z.infer<typeof headingBlockStyleSchema>;
export type CodeBlockStyle = z.infer<typeof codeBlockStyleSchema>;
export type TodoBlockStyle = z.infer<typeof todoBlockStyleSchema>;
export type ListBlockStyle = z.infer<typeof listBlockStyleSchema>;
export type QuoteBlockStyle = z.infer<typeof quoteBlockStyleSchema>;

/**
 * 文本元素样式 Schema
 * 用于文本内容的局部样式（富文本格式）
 */
export const textElementStyleSchema = z
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
        "背景色：1-7=浅色系（红橙黄绿蓝紫灰），8-14=深色系，15=浅灰"
      ),
    text_color: z
      .number()
      .int()
      .min(1)
      .max(7)
      .optional()
      .describe("字体颜色：1=红，2=橙，3=黄，4=绿，5=蓝，6=紫，7=灰"),
  })
  .describe("文本元素局部样式配置");

export type TextElementStyle = z.infer<typeof textElementStyleSchema>;

/**
 * 链接 Schema
 */
export const linkSchema = z
  .object({
    url: z.string().describe("超链接 URL（需要 url_encode）"),
  })
  .describe("超链接配置");

export type Link = z.infer<typeof linkSchema>;

/**
 * 文本运行（text_run）Schema
 */
export const textRunSchema = z
  .object({
    content: z.string().describe("文本内容，支持 \\n 实现软换行"),
    text_element_style: textElementStyleSchema.optional(),
  })
  .describe("文本运行元素");

export type TextRun = z.infer<typeof textRunSchema>;

/**
 * 文本元素 Schema
 * 文本块的内容元素，可以是纯文本、链接、@用户、@文档等
 */
export const textElementSchema = z
  .object({
    text_run: textRunSchema.optional(),
    // 可以继续扩展 mention_user, mention_doc, equation 等
  })
  .describe("文本元素");

export type TextElement = z.infer<typeof textElementSchema>;

/**
 * 块类型枚举
 */
export const BlockType = z.enum([
  "1", // Page
  "2", // Text
  "3", // Heading1
  "4", // Heading2
  "5", // Heading3
  "6", // Heading4
  "7", // Heading5
  "8", // Heading6
  "9", // Heading7
  "10", // Heading8
  "11", // Heading9
  "12", // Bullet
  "13", // Ordered
  "14", // Code
  "15", // Quote
  "17", // Todo
  "18", // Bitable
  "19", // Callout
  "20", // ChatCard
  "21", // Diagram
  "22", // Divider
  "23", // File
  "24", // Grid
  "25", // GridColumn
  "26", // Iframe
  "27", // Image
  "28", // ISV
  "29", // MindNote
  "30", // Sheet
  "31", // Table
  "32", // TableCell
  "33", // View
  "34", // QuoteContainer
  "35", // Task
  "36", // OKR
  "37", // OKRObjective
  "38", // OKRKeyResult
  "39", // OKRProgress
  "40", // Widget
  "41", // Jira
  "42", // WikiCatalog
  "43", // Board
  "44", // Agenda
  "45", // AgendaItem
  "46", // AgendaItemTitle
  "47", // AgendaItemContent
  "48", // LinkPreview
  "49", // SyncBlock
  "50", // ReferenceSyncBlock
  "51", // WikiCatalogNew
  "52", // AITemplate
  "999", // Undefined
]);

/**
 * 块类型映射（数字 -> 名称）
 */
export const BLOCK_TYPE_MAP = {
  1: "page",
  2: "text",
  3: "heading1",
  4: "heading2",
  5: "heading3",
  6: "heading4",
  7: "heading5",
  8: "heading6",
  9: "heading7",
  10: "heading8",
  11: "heading9",
  12: "bullet",
  13: "ordered",
  14: "code",
  15: "quote",
  17: "todo",
  18: "bitable",
  19: "callout",
  20: "chat_card",
  21: "diagram",
  22: "divider",
  23: "file",
  24: "grid",
  25: "grid_column",
  26: "iframe",
  27: "image",
  28: "isv",
  29: "mindnote",
  30: "sheet",
  31: "table",
  32: "table_cell",
  33: "view",
  34: "quote_container",
  35: "task",
  36: "okr",
  37: "okr_objective",
  38: "okr_key_result",
  39: "okr_progress",
  40: "widget",
  41: "jira",
  42: "wiki_catalog",
  43: "board",
  44: "agenda",
  45: "agenda_item",
  46: "agenda_item_title",
  47: "agenda_item_content",
  48: "link_preview",
  49: "sync_block",
  50: "reference_sync_block",
  51: "wiki_catalog_new",
  52: "ai_template",
  999: "undefined",
} as const;

export type BlockTypeName = (typeof BLOCK_TYPE_MAP)[keyof typeof BLOCK_TYPE_MAP];
