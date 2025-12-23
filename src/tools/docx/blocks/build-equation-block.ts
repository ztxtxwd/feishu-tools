/**
 * Equation Block 工具 (公式块)
 *
 * block_type: 16
 */
import { createTextBlockTool } from "./factories/text-block-factory.js";

/**
 * 构建 Equation Block 工具
 */
export const buildEquationBlock = createTextBlockTool({
  blockType: 16,
  blockName: "equation",
  displayName: "公式",
  description: {
    summary:
      "构建飞书文档的公式块数据结构。使用 KaTeX 语法编写数学公式，支持复杂的数学表达式。",
    bestFor: "创建数学公式、科学表达式、技术文档中的方程式",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_block）、简单文本内容时（请使用 build_text_block）",
  },
});
