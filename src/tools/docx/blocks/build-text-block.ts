/**
 * Text Block 工具
 *
 * 使用工厂函数创建，支持富文本格式
 */
import { createTextBlockTool } from "./factories/text-block-factory.js";

/**
 * 构建 Text Block 工具
 */
export const buildTextBlock = createTextBlockTool({
  blockType: 2,
  blockName: "text",
  displayName: "文本",
  description: {
    summary:
      "构建飞书文档的 Text 块数据结构。支持富文本格式（加粗、斜体、链接等）、@用户、@文档、公式、日期提醒等元素。",
    bestFor:
      "构建要插入文档的文本块、创建带有富文本格式的内容、构建包含 @ 提及的文本",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_block）、只需要简单纯文本时（请使用 convert_content_to_blocks）",
  },
  supportsFolded: true,
  supportsIndentation: true,
});
