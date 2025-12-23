/**
 * Bullet Block 工具 (无序列表)
 *
 * block_type: 12
 */
import { createTextBlockTool } from "./factories/text-block-factory.js";

/**
 * 构建 Bullet Block 工具
 */
export const buildBulletBlock = createTextBlockTool({
  blockType: 12,
  blockName: "bullet",
  displayName: "无序列表",
  description: {
    summary:
      "构建飞书文档的无序列表块数据结构。支持富文本格式（加粗、斜体、链接等）、@用户、@文档等元素。",
    bestFor: "创建无序列表项、要点列表",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_block）、需要有序列表时（请使用 build_ordered_block）、只需要简单纯文本时（请使用 convert_content_to_blocks）",
  },
  supportsFolded: true,
});
