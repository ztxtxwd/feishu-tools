import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * Align 枚举 Schema
 */
const alignSchema = z
  .enum(["1", "2", "3"])
  .transform((val) => parseInt(val, 10) as 1 | 2 | 3)
  .or(z.literal(1).or(z.literal(2)).or(z.literal(3)))
  .describe("对齐方式：1=居左排版，2=居中排版，3=居右排版");

/**
 * ChatCard Block 输出 Schema
 */
const chatCardBlockOutputSchema = {
  block_type: z.literal(20).describe("块类型，ChatCard 块固定为 20"),
  chat_card: z
    .object({
      chat_id: z
        .string()
        .describe("群聊天会话的 OpenID，以 'oc_' 开头"),
      align: z
        .number()
        .optional()
        .describe("对齐方式：1=居左，2=居中，3=居右"),
    })
    .describe("会话卡片块内容"),
};

/**
 * 构建 ChatCard Block 工具
 *
 * 用于构建飞书文档的会话卡片块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_block 等 API。
 */
export const buildChatCardBlock = defineTool({
  name: "build_chat_card_block",
  description: {
    summary:
      "构建飞书文档的 ChatCard 块（会话卡片）数据结构。会话卡片用于在文档中嵌入群聊会话的卡片链接。",
    bestFor:
      "在文档中引用群聊会话、创建群聊卡片链接、展示关联的群聊信息",
    notRecommendedFor:
      "发送消息到群聊（请使用 IM 相关 API）、创建新群聊（请使用群组 API）",
  },
  inputSchema: {
    chat_id: z
      .string()
      .describe(
        "群聊天会话的 OpenID，以 'oc_' 开头。例如：oc_xxx。对于写操作，如果用户不在该群则返回无权限错误。"
      ),
    align: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .optional()
      .describe("对齐方式：1=居左排版（默认），2=居中排版，3=居右排版"),
  },
  outputSchema: chatCardBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    const chatCard: { chat_id: string; align?: number } = {
      chat_id: args.chat_id,
    };

    // 只有在明确指定 align 时才添加
    if (args.align !== undefined) {
      chatCard.align = args.align;
    }

    const block = {
      block_type: 20 as const,
      chat_card: chatCard,
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
