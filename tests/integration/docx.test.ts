/**
 * 集成测试 - docx 文档块操作
 *
 * 运行前需要配置以下环境变量：
 * - FEISHU_APP_ID: 飞书应用 ID
 * - FEISHU_APP_SECRET: 飞书应用 Secret
 * - TEST_DOCUMENT_ID: 用于测试的飞书文档 ID
 * - TEST_BLOCK_ID: 用于测试的父块 ID（通常是文档的 page block ID，与 document_id 相同）
 *
 * 运行命令：
 *   npm run test:run -- tests/integration/docx.test.ts
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@larksuiteoapi/node-sdk";
import { createHeading1Block, createTextBlock, listDocumentBlocks } from "../../src/tools/docx/blocks/index.js";
import type { FeishuContext } from "../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// 检查必要的环境变量
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const TEST_DOCUMENT_ID = process.env.TEST_DOCUMENT_ID;
const TEST_BLOCK_ID = process.env.TEST_BLOCK_ID;

const hasCredentials = FEISHU_APP_ID && FEISHU_APP_SECRET && TEST_DOCUMENT_ID && TEST_BLOCK_ID;

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

// 用于记录测试创建的 block，以便清理
const createdBlockIds: string[] = [];

describe.skipIf(!hasCredentials)("Docx Blocks - Integration Tests", () => {
  let client: Client;
  let context: FeishuContext;

  beforeAll(() => {
    client = new Client({
      appId: FEISHU_APP_ID!,
      appSecret: FEISHU_APP_SECRET!,
    });
    context = { client };
  });

  afterAll(async () => {
    // 清理测试创建的 blocks
    if (createdBlockIds.length > 0) {
      console.log(`Cleaning up ${createdBlockIds.length} test blocks...`);
      for (const blockId of createdBlockIds) {
        try {
          await client.docx.v1.documentBlockChildren.batchDelete({
            path: {
              document_id: TEST_DOCUMENT_ID!,
              block_id: blockId,
            },
            params: {
              document_revision_id: -1,
            },
            data: {
              start_index: 0,
              end_index: 1,
            },
          });
          console.log(`Deleted block: ${blockId}`);
        } catch (error) {
          console.warn(`Failed to delete block ${blockId}:`, error);
        }
      }
    }
  });

  describe("createHeading1Block", () => {
    it("should create a heading1 block in real document", async () => {
      const testText = `集成测试标题 - ${new Date().toISOString()}`;
      const args = {
        document_id: TEST_DOCUMENT_ID!,
        block_id: TEST_BLOCK_ID!,
        index: 0,
        text: testText,
      };

      const result = await createHeading1Block.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");

      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();
      expect(responseData.children.length).toBeGreaterThan(0);

      const newBlockId = responseData.children[0].block_id;
      createdBlockIds.push(newBlockId);
      console.log(`Created heading1 block: ${newBlockId}`);
    });

    it("should return error for invalid document_id", async () => {
      const args = {
        document_id: "invalid_document_id_12345",
        block_id: TEST_BLOCK_ID!,
        index: 0,
        text: "Should fail",
      };

      const result = await createHeading1Block.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
    });
  });

  describe("createTextBlock", () => {
    it("should create a text block in real document", async () => {
      const testText = `集成测试文本 - ${new Date().toISOString()}`;
      const args = {
        document_id: TEST_DOCUMENT_ID!,
        block_id: TEST_BLOCK_ID!,
        index: 0,
        text: testText,
      };

      const result = await createTextBlock.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");

      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.children).toBeDefined();

      const newBlockId = responseData.children[0].block_id;
      createdBlockIds.push(newBlockId);
      console.log(`Created text block: ${newBlockId}`);
    });
  });

  describe("listDocumentBlocks", () => {
    it("should list all blocks using iterator mode (default)", async () => {
      const args = {
        document_id: TEST_DOCUMENT_ID!,
      };

      const result = await listDocumentBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");

      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.items).toBeDefined();
      expect(Array.isArray(responseData.items)).toBe(true);
      expect(responseData.items.length).toBeGreaterThan(0);

      // 验证返回的 block 结构
      const firstBlock = responseData.items[0];
      expect(firstBlock.block_id).toBeDefined();
      expect(firstBlock.block_type).toBeDefined();

      console.log(`Listed ${responseData.items.length} blocks in iterator mode`);
    });

    it("should list blocks with manual pagination", async () => {
      const args = {
        document_id: TEST_DOCUMENT_ID!,
        page_size: 10,
      };

      const result = await listDocumentBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");

      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.items).toBeDefined();
      expect(Array.isArray(responseData.items)).toBe(true);

      // 手动分页模式会返回 has_more 字段
      expect(responseData.has_more).toBeDefined();

      console.log(`Listed ${responseData.items.length} blocks with manual pagination, has_more: ${responseData.has_more}`);
    });

    it("should return error for invalid document_id", async () => {
      const args = {
        document_id: "invalid_document_id_12345",
        page_size: 10, // 使用手动分页模式以获得明确的错误响应
      };

      const result = await listDocumentBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
    });
  });
});

// 当没有配置环境变量时，输出提示信息
describe.skipIf(hasCredentials)("Docx Blocks - Integration Tests (skipped)", () => {
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
║    TEST_BLOCK_ID=your_test_block_id                            ║
║                                                                ║
║  Run with:                                                     ║
║    FEISHU_APP_ID=xxx FEISHU_APP_SECRET=xxx \\                   ║
║    TEST_DOCUMENT_ID=xxx TEST_BLOCK_ID=xxx \\                    ║
║    npm run test:run -- tests/integration/docx.test.ts          ║
╚════════════════════════════════════════════════════════════════╝
    `);
    expect(true).toBe(true);
  });
});
