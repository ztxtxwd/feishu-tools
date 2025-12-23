/**
 * Ordered Block 工具 (有序列表)
 *
 * block_type: 13
 */
import { createTextBlockTool } from "./factories/text-block-factory.js";

/**
 * 构建 Ordered Block 工具
 */
export const buildOrderedBlock = createTextBlockTool({
  blockType: 13,
  blockName: "ordered",
  displayName: "有序列表",
  description: {
    summary:
      "构建飞书文档的有序列表块数据结构。支持富文本格式（加粗、斜体、链接等）、@用户、@文档等元素。",
    bestFor: "创建有序列表项、步骤列表、编号列表",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_block）、需要无序列表时（请使用 build_bullet_block）、只需要简单纯文本时（请使用 convert_content_to_blocks）",
  },
  supportsFolded: true,
});
