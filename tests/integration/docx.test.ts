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
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@larksuiteoapi/node-sdk";
import { listDocumentBlocks } from "../../src/tools/docx/blocks/index.js";
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

    it("should list blocks for a specific block_id", async () => {
      const args = {
        document_id: TEST_DOCUMENT_ID!,
        block_id: TEST_BLOCK_ID!,
      };

      const result = await listDocumentBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");

      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.items).toBeDefined();
      expect(Array.isArray(responseData.items)).toBe(true);

      console.log(`Listed ${responseData.items.length} blocks for block_id: ${TEST_BLOCK_ID}`);
    });

    it("should return empty result for invalid document_id (SDK iterator limitation)", async () => {
      // 注意：SDK 的迭代器模式在遇到 API 错误时不会抛出异常，而是返回空结果
      // 这是 SDK 的设计行为，迭代器会静默处理错误并返回空的 items
      const args = {
        document_id: "invalid_document_id_12345",
      } as Parameters<typeof listDocumentBlocks.callback>[1];

      const result = await listDocumentBlocks.callback(context, args, mockExtra);

      // 由于 SDK 迭代器的限制，无效的 document_id 会返回空结果而非错误
      expect(result.isError).toBeUndefined();
      const responseData = JSON.parse((result.content[0] as { text: string }).text);
      expect(responseData.items).toEqual([]);
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
