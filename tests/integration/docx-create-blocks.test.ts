/**
 * 集成测试 - docx 文档块创建操作
 *
 * 运行前需要配置以下环境变量:
 * - FEISHU_APP_ID: 飞书应用 ID
 * - FEISHU_APP_SECRET: 飞书应用 Secret
 * - TEST_DOCUMENT_ID: 用于测试的飞书文档 ID (默认使用: u-fmSAQZqOV7lV6LkEm9VKifg02uL0kkoPUoaaUQk00e4Y)
 *
 * 运行命令:
 *   npm run test:run -- tests/integration/docx-create-blocks.test.ts
 */

import "dotenv/config";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { Client } from "@larksuiteoapi/node-sdk";
import {
  createBlocks,
  buildTextBlock,
  buildHeading1Block,
  buildHeading2Block,
  buildHeading3Block,
  buildBulletBlock,
  buildOrderedBlock,
  buildCodeBlock,
  buildQuoteBlock,
  buildTodoBlock,
  buildCalloutBlock,
  buildDividerBlock,
  buildCountdownBlock,
  listDocumentBlocks,
} from "../../src/tools/docx/blocks/index.js";
import type { FeishuContext } from "../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";

// 检查必要的环境变量
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const TEST_DOCUMENT_ID =
  process.env.TEST_DOCUMENT_ID || "u-fmSAQZqOV7lV6LkEm9VKifg02uL0kkoPUoaaUQk00e4Y";

const hasCredentials = FEISHU_APP_ID && FEISHU_APP_SECRET && TEST_DOCUMENT_ID;

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe.skipIf(!hasCredentials)("Docx Create Blocks - Integration Tests", () => {
  let client: Client;
  let context: FeishuContext;

  beforeAll(() => {
    client = new Client({
      appId: FEISHU_APP_ID!,
      appSecret: FEISHU_APP_SECRET!,
    });
    context = { client };
  });

  // 在每个测试之间添加延迟，避免触发飞书API速率限制
  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms延迟
  });

  describe("createBlocks - 文本类块", () => {
    it("should create a simple text block", async () => {
      const textBlock = await buildTextBlock.callback(
        context,
        {
          elements: [{ text_run: { content: "这是一个简单的文本块" } }],
        },
        mockExtra
      );

      const textBlockData = textBlock.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["text_1"],
        descendants: [
          {
            block_id: "text_1",
            ...textBlockData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");

      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();
      expect(responseData.children.length).toBeGreaterThan(0);

      console.log(
        `✓ Created text block: ${responseData.children[0].block_id}`
      );
    });

    it("should create a text block with rich formatting", async () => {
      const textBlock = await buildTextBlock.callback(
        context,
        {
          elements: [
            {
              text_run: {
                content: "这是加粗文本",
                text_element_style: {
                  bold: true,
                },
              },
            },
          ],
        },
        mockExtra
      );

      const textBlockData = textBlock.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["text_rich_1"],
        descendants: [
          {
            block_id: "text_rich_1",
            ...textBlockData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      console.log(
        `✓ Created rich text block: ${responseData.children[0].block_id}`
      );
    });
  });

  describe("createBlocks - 标题块", () => {
    it("should create heading blocks (H1, H2, H3)", async () => {
      const h1Block = await buildHeading1Block.callback(
        context,
        { elements: [{ text_run: { content: "一级标题" } }] },
        mockExtra
      );
      const h2Block = await buildHeading2Block.callback(
        context,
        { elements: [{ text_run: { content: "二级标题" } }] },
        mockExtra
      );
      const h3Block = await buildHeading3Block.callback(
        context,
        { elements: [{ text_run: { content: "三级标题" } }] },
        mockExtra
      );

      const h1Data = h1Block.structuredContent!;
      const h2Data = h2Block.structuredContent!;
      const h3Data = h3Block.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["h1_1", "h2_1", "h3_1"],
        descendants: [
          {
            block_id: "h1_1",
            ...h1Data,
          },
          {
            block_id: "h2_1",
            ...h2Data,
          },
          {
            block_id: "h3_1",
            ...h3Data,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children.length).toBe(3);

      console.log(`✓ Created 3 heading blocks`);
    });
  });

  describe("createBlocks - 列表块", () => {
    it("should create bullet list items", async () => {
      const bullet1 = await buildBulletBlock.callback(
        context,
        { elements: [{ text_run: { content: "第一个要点" } }] },
        mockExtra
      );
      const bullet2 = await buildBulletBlock.callback(
        context,
        { elements: [{ text_run: { content: "第二个要点" } }] },
        mockExtra
      );

      const bullet1Data = bullet1.structuredContent!;
      const bullet2Data = bullet2.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["bullet_1", "bullet_2"],
        descendants: [
          {
            block_id: "bullet_1",
            ...bullet1Data,
          },
          {
            block_id: "bullet_2",
            ...bullet2Data,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children.length).toBe(2);

      console.log(`✓ Created 2 bullet list items`);
    });

    it("should create ordered list items", async () => {
      const ordered1 = await buildOrderedBlock.callback(
        context,
        { elements: [{ text_run: { content: "第一步" } }] },
        mockExtra
      );
      const ordered2 = await buildOrderedBlock.callback(
        context,
        { elements: [{ text_run: { content: "第二步" } }] },
        mockExtra
      );

      const ordered1Data = ordered1.structuredContent!;
      const ordered2Data = ordered2.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["ordered_1", "ordered_2"],
        descendants: [
          {
            block_id: "ordered_1",
            ...ordered1Data,
          },
          {
            block_id: "ordered_2",
            ...ordered2Data,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children.length).toBe(2);

      console.log(`✓ Created 2 ordered list items`);
    });
  });

  describe("createBlocks - 代码块和引用块", () => {
    it("should create a code block with syntax highlighting", async () => {
      const codeBlock = await buildCodeBlock.callback(
        context,
        {
          elements: [{ text_run: { content: 'console.log("Hello, World!");' } }],
          style: {
            language: 1, // JavaScript
            wrap: true,
          },
        },
        mockExtra
      );

      const codeBlockData = codeBlock.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["code_1"],
        descendants: [
          {
            block_id: "code_1",
            ...codeBlockData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      console.log(`✓ Created code block`);
    });

    it("should create a quote block", async () => {
      const quoteBlock = await buildQuoteBlock.callback(
        context,
        { elements: [{ text_run: { content: "这是一段引用文本" } }] },
        mockExtra
      );

      const quoteBlockData = quoteBlock.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["quote_1"],
        descendants: [
          {
            block_id: "quote_1",
            ...quoteBlockData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      console.log(`✓ Created quote block`);
    });
  });

  describe("createBlocks - 其他类型块", () => {
    it("should create a todo block", async () => {
      const todoBlock = await buildTodoBlock.callback(
        context,
        { elements: [{ text_run: { content: "待办事项" } }] },
        mockExtra
      );

      const todoBlockData = todoBlock.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["todo_1"],
        descendants: [
          {
            block_id: "todo_1",
            ...todoBlockData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      console.log(`✓ Created todo block`);
    });

    it("should create a divider block", async () => {
      const dividerBlock = await buildDividerBlock.callback(
        context,
        {},
        mockExtra
      );

      const dividerBlockData = dividerBlock.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["divider_1"],
        descendants: [
          {
            block_id: "divider_1",
            ...dividerBlockData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      console.log(`✓ Created divider block`);
    });

    it("should create a callout block with content", async () => {
      // Callout 块不能为空，必须包含至少一个子块
      const calloutBlock = await buildCalloutBlock.callback(
        context,
        {
          emoji_id: "bulb", // 灯泡
          background_color: 1, // 浅红色
          border_color: 1, // 深红色
        },
        mockExtra
      );

      const textBlock = await buildTextBlock.callback(
        context,
        { elements: [{ text_run: { content: "重要提示内容" } }] },
        mockExtra
      );

      const calloutData = calloutBlock.structuredContent!;
      const textData = textBlock.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["callout_1"],
        descendants: [
          {
            block_id: "callout_1",
            ...calloutData,
            children: ["callout_text_1"],
          },
          {
            block_id: "callout_text_1",
            ...textData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      console.log(`✓ Created callout block with content`);
    });

    it("should create a countdown block with target datetime", async () => {
      // 创建一个倒计时到未来某个时间的倒计时块
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30天后
      const targetDateTime = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')} 12:00`;

      const countdownBlock = await buildCountdownBlock.callback(
        context,
        {
          targetDateTime,
          color: "RED",
          notify: true,
        },
        mockExtra
      );

      const countdownData = countdownBlock.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["countdown_1"],
        descendants: [
          {
            block_id: "countdown_1",
            ...countdownData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      console.log(`✓ Created countdown block with target datetime`);
    });

    it("should create a countdown block with duration", async () => {
      // 创建一个持续时间模式的倒计时块（7天倒计时）
      const countdownBlock = await buildCountdownBlock.callback(
        context,
        {
          days: 7,
          hours: 12,
          minutes: 30,
          color: "BLUE",
        },
        mockExtra
      );

      const countdownData = countdownBlock.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["countdown_2"],
        descendants: [
          {
            block_id: "countdown_2",
            ...countdownData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      console.log(`✓ Created countdown block with duration (7 days 12 hours 30 minutes)`);
    });

    it("should create countdown blocks with different colors", async () => {
      // 创建多个不同颜色的倒计时块
      const countdown1 = await buildCountdownBlock.callback(
        context,
        { days: 3, color: "GREEN" },
        mockExtra
      );
      const countdown2 = await buildCountdownBlock.callback(
        context,
        { days: 5, color: "PURPLE" },
        mockExtra
      );
      const countdown3 = await buildCountdownBlock.callback(
        context,
        { days: 7, color: "ORANGE" },
        mockExtra
      );

      const countdown1Data = countdown1.structuredContent!;
      const countdown2Data = countdown2.structuredContent!;
      const countdown3Data = countdown3.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["countdown_green", "countdown_purple", "countdown_orange"],
        descendants: [
          {
            block_id: "countdown_green",
            ...countdown1Data,
          },
          {
            block_id: "countdown_purple",
            ...countdown2Data,
          },
          {
            block_id: "countdown_orange",
            ...countdown3Data,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children.length).toBe(3);

      console.log(`✓ Created 3 countdown blocks with different colors`);
    });
  });

  describe("createBlocks - 嵌套结构", () => {
    it("should create nested bullet list", async () => {
      const parentBullet = await buildBulletBlock.callback(
        context,
        { elements: [{ text_run: { content: "父级要点" } }] },
        mockExtra
      );
      const childBullet1 = await buildBulletBlock.callback(
        context,
        { elements: [{ text_run: { content: "子要点 1" } }] },
        mockExtra
      );
      const childBullet2 = await buildBulletBlock.callback(
        context,
        { elements: [{ text_run: { content: "子要点 2" } }] },
        mockExtra
      );

      const parentData = parentBullet.structuredContent!;
      const child1Data = childBullet1.structuredContent!;
      const child2Data = childBullet2.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["parent_bullet"],
        descendants: [
          {
            block_id: "parent_bullet",
            ...parentData,
            children: ["child_bullet_1", "child_bullet_2"],
          },
          {
            block_id: "child_bullet_1",
            ...child1Data,
          },
          {
            block_id: "child_bullet_2",
            ...child2Data,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      console.log(`✓ Created nested bullet list`);
    });

    it("should create callout with nested content", async () => {
      const calloutBlock = await buildCalloutBlock.callback(
        context,
        {
          emoji_id: "warning", // ⚠️ 警告符号
          background_color: 3, // 浅黄色
          border_color: 3, // 深黄色
        },
        mockExtra
      );

      const textBlock = await buildTextBlock.callback(
        context,
        { elements: [{ text_run: { content: "这是 Callout 内的文本" } }] },
        mockExtra
      );

      const calloutData = calloutBlock.structuredContent!;
      const textData = textBlock.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["callout_nested"],
        descendants: [
          {
            block_id: "callout_nested",
            ...calloutData,
            children: ["callout_text"],
          },
          {
            block_id: "callout_text",
            ...textData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      console.log(`✓ Created callout with nested content`);
    });
  });

  describe("createBlocks - 复杂场景", () => {
    it("should create multiple different block types at once", async () => {
      const heading = await buildHeading2Block.callback(
        context,
        { elements: [{ text_run: { content: "混合内容测试" } }] },
        mockExtra
      );
      const text = await buildTextBlock.callback(
        context,
        { elements: [{ text_run: { content: "这是一段说明文字" } }] },
        mockExtra
      );
      const code = await buildCodeBlock.callback(
        context,
        {
          elements: [{ text_run: { content: "const test = true;" } }],
          style: { language: 1 },
        },
        mockExtra
      );
      const divider = await buildDividerBlock.callback(context, {}, mockExtra);
      const quote = await buildQuoteBlock.callback(
        context,
        { elements: [{ text_run: { content: "总结一下" } }] },
        mockExtra
      );

      const headingData = heading.structuredContent!;
      const textData = text.structuredContent!;
      const codeData = code.structuredContent!;
      const dividerData = divider.structuredContent!;
      const quoteData = quote.structuredContent!;

      const args = {
        document_id: TEST_DOCUMENT_ID,
        children_id: ["h2_mixed", "text_mixed", "code_mixed", "div_mixed", "quote_mixed"],
        descendants: [
          {
            block_id: "h2_mixed",
            ...headingData,
          },
          {
            block_id: "text_mixed",
            ...textData,
          },
          {
            block_id: "code_mixed",
            ...codeData,
          },
          {
            block_id: "div_mixed",
            ...dividerData,
          },
          {
            block_id: "quote_mixed",
            ...quoteData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children.length).toBe(5);

      console.log(`✓ Created 5 different block types in one call`);
    });
  });

  describe("createBlocks - 错误处理", () => {
    it("should handle invalid document_id gracefully", async () => {
      const textBlock = await buildTextBlock.callback(
        context,
        { elements: [{ text_run: { content: "测试块" } }] },
        mockExtra
      );

      const textData = textBlock.structuredContent!;

      const args = {
        document_id: "invalid_document_id",
        children_id: ["test_1"],
        descendants: [
          {
            block_id: "test_1",
            ...textData,
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe("text");

      console.log(`✓ Properly handled invalid document_id`);
    });
  });

  describe("验证创建的块", () => {
    it("should verify blocks were created successfully", async () => {
      const listResult = await listDocumentBlocks.callback(
        context,
        { document_id: TEST_DOCUMENT_ID },
        mockExtra
      );

      expect(listResult.isError).toBeUndefined();
      const responseData = JSON.parse(
        (listResult.content[0] as { text: string }).text
      );

      expect(responseData.items).toBeDefined();
      expect(responseData.items.length).toBeGreaterThan(0);

      console.log(
        `✓ Verified document has ${responseData.items.length} blocks`
      );
    });
  });
});

// 当没有配置环境变量时，输出提示信息
describe.skipIf(hasCredentials)(
  "Docx Create Blocks - Integration Tests (skipped)",
  () => {
    it("should skip when credentials are not configured", () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Integration tests skipped - missing environment variables     ║
╠════════════════════════════════════════════════════════════════╣
║  Please set the following environment variables:               ║
║                                                                ║
║    FEISHU_APP_ID=your_app_id                                   ║
║    FEISHU_APP_SECRET=your_app_secret                           ║
║    TEST_DOCUMENT_ID=your_test_document_id                      ║
║                                                                ║
║  Run with:                                                     ║
║    FEISHU_APP_ID=xxx FEISHU_APP_SECRET=xxx \\                   ║
║    TEST_DOCUMENT_ID=xxx \\                                      ║
║    npm run test:run -- tests/integration/docx-create-blocks.ts ║
╚════════════════════════════════════════════════════════════════╝
      `);
      expect(true).toBe(true);
    });
  }
);
