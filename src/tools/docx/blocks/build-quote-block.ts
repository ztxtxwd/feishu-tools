/**
 * Quote Block 工具 (引用块)
 *
 * block_type: 15
 */
import { createTextBlockTool } from "./factories/text-block-factory.js";

/**
 * 构建 Quote Block 工具
 */
export const buildQuoteBlock = createTextBlockTool({
  blockType: 15,
  blockName: "quote",
  displayName: "引用",
  description: {
    summary:
      "构建飞书文档的引用块数据结构。支持富文本格式（加粗、斜体、链接等）、@用户、@文档等元素。",
    bestFor: "创建引用内容、引述他人观点",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_block）、只需要简单纯文本时（请使用 convert_content_to_blocks）",
  },
});
