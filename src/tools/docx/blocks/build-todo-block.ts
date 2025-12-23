/**
 * Todo Block 工具 (待办事项)
 *
 * block_type: 17
 */
import { z } from "zod";
import { createTextBlockTool } from "./factories/text-block-factory.js";

/**
 * 构建 Todo Block 工具
 */
export const buildTodoBlock = createTextBlockTool({
  blockType: 17,
  blockName: "todo",
  displayName: "待办事项",
  description: {
    summary:
      "构建飞书文档的待办事项块数据结构。支持富文本格式（加粗、斜体、链接等）、@用户、@文档等元素，以及完成状态。",
    bestFor: "创建待办事项、任务清单、检查列表",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_block）、只需要简单纯文本时（请使用 convert_content_to_blocks）",
  },
  supportsFolded: true,
  extraStyleSchema: {
    done: z.boolean().optional().describe("待办事项的完成状态"),
  },
});
