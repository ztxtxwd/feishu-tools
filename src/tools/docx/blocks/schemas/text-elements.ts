/**
 * 飞书文档文本元素共享 Schema
 *
 * 这些 Schema 被多种块类型共享：
 * - Text (block_type: 2)
 * - Heading1~9 (block_type: 3~11)
 * - Bullet (block_type: 12)
 * - Ordered (block_type: 13)
 * - Code (block_type: 14)
 * - Quote (block_type: 15)
 * - Todo (block_type: 17)
 */
import { z } from "zod";

/**
 * 文本元素样式 Schema
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
export const textRunSchema = z
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
export const mentionUserSchema = z
  .object({
    user_id: z.string().describe("用户 OpenID"),
    text_element_style: textElementStyleSchema.optional(),
  })
  .describe("@用户元素");

/**
 * @文档元素 Schema
 */
export const mentionDocSchema = z
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
export const reminderSchema = z
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
export const equationSchema = z
  .object({
    content: z.string().describe("符合 KaTeX 语法的公式内容"),
    text_element_style: textElementStyleSchema.optional(),
  })
  .describe("公式元素");

/**
 * 文本元素 Schema（联合类型）
 */
export const textElementSchema = z
  .object({
    text_run: textRunSchema.optional(),
    mention_user: mentionUserSchema.optional(),
    mention_doc: mentionDocSchema.optional(),
    reminder: reminderSchema.optional(),
    equation: equationSchema.optional(),
  })
  .describe("文本元素，每个元素只能包含一种类型");

/**
 * 块背景色枚举
 */
export const blockBackgroundColorSchema = z
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
  .describe("块背景色");

/**
 * 对齐方式 Schema
 */
export const alignSchema = z
  .number()
  .int()
  .min(1)
  .max(3)
  .describe("对齐方式：1=居左（默认）, 2=居中, 3=居右");

/**
 * 基础块样式 Schema（所有文本类块共享）
 */
export const baseBlockStyleSchema = z
  .object({
    align: alignSchema.optional(),
    background_color: blockBackgroundColorSchema.optional(),
  })
  .describe("基础块样式");

/**
 * 代码块语言类型
 */
export const codeLanguageSchema = z
  .number()
  .int()
  .min(1)
  .max(75)
  .describe(
    "代码语言：1=PlainText, 7=Bash, 8=CSharp, 9=C++, 10=C, 12=CSS, 22=Go, 24=HTML, 28=JSON, 29=Java, 30=JavaScript, 32=Kotlin, 39=Markdown, 43=PHP, 49=Python, 52=Ruby, 53=Rust, 56=SQL, 61=Swift, 63=TypeScript, 66=XML, 67=YAML"
  );
