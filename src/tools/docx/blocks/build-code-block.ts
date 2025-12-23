/**
 * Code Block 工具 (代码块)
 *
 * block_type: 14
 */
import { z } from "zod";
import { createTextBlockTool } from "./factories/text-block-factory.js";
import { codeLanguageSchema } from "./schemas/text-elements.js";

/**
 * 构建 Code Block 工具
 */
export const buildCodeBlock = createTextBlockTool({
  blockType: 14,
  blockName: "code",
  displayName: "代码块",
  description: {
    summary:
      "构建飞书文档的代码块数据结构。支持多种编程语言语法高亮和自动换行设置。",
    bestFor: "创建代码片段、展示源代码",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_block）、行内代码时（请使用 text_element_style.inline_code）、只需要简单纯文本时（请使用 convert_content_to_blocks）",
  },
  extraStyleSchema: {
    language: codeLanguageSchema.optional(),
    wrap: z.boolean().optional().describe("代码块是否自动换行"),
  },
});
