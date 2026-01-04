import { describe, it, expect, vi, beforeEach } from "vitest";
import { listDocumentBlocks } from "../../../../../src/tools/docx/blocks/list-blocks.js";
import * as lark from "@larksuiteoapi/node-sdk";
import { resolveToken } from "../../../../../src/utils/token.js";

// Mock the lark SDK
vi.mock("@larksuiteoapi/node-sdk", () => ({
  withUserAccessToken: vi.fn(),
}));

// Mock the token utility
vi.mock("../../../../../src/utils/token.js", () => ({
  resolveToken: vi.fn(),
}));

describe("listDocumentBlocks", () => {
  const mockClient = {
    docx: {
      v1: {
        documentBlockChildren: {
          getWithIterator: vi.fn(),
        },
      },
    },
  };

  const mockContext = {
    client: mockClient,
    getUserAccessToken: vi.fn(),
    getTenantAccessToken: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(listDocumentBlocks.name).toBe("list_document_blocks");
    });

    it("should have description", () => {
      expect(listDocumentBlocks.description).toBeDefined();
      expect(listDocumentBlocks.description).toContain("获取文档所有块或指定块的所有子孙块");
    });

    it("should have correct input schema", () => {
      const schema = listDocumentBlocks.inputSchema;
      expect(schema).toHaveProperty("document_id");
      expect(schema).toHaveProperty("block_id");
      expect(schema).toHaveProperty("document_revision_id");
      expect(schema).toHaveProperty("user_id_type");
    });

    it("should have correct output schema", () => {
      const schema = listDocumentBlocks.outputSchema;
      expect(schema).toHaveProperty("items");
    });
  });

  describe("callback - get all document blocks", () => {
    it("should use document_id as block_id when block_id is not provided", async () => {
      const mockItems = [
        { block_id: "block1", block_type: 2 },
        { block_id: "block2", block_type: 4 },
      ];
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield { items: mockItems };
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.getWithIterator.mockResolvedValue(mockIterator);

      const result = await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
      });

      expect(resolveToken).toHaveBeenCalledWith(mockContext.getUserAccessToken);
      expect(lark.withUserAccessToken).toHaveBeenCalledWith("user_access_token");
      expect(mockClient.docx.v1.documentBlockChildren.getWithIterator).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123", block_id: "doc123" },
          params: { with_descendants: true },
        },
        { userId: 123 }
      );
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify({ items: mockItems }, null, 2),
          },
        ],
        structuredContent: { items: mockItems },
      });
    });

    it("should use tenant access token when user token is not available", async () => {
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield { items: [{ block_id: "block1" }] };
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.getWithIterator.mockResolvedValue(mockIterator);

      await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
      });

      expect(mockClient.docx.v1.documentBlockChildren.getWithIterator).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
    });
  });

  describe("callback - get specific block children", () => {
    it("should use provided block_id", async () => {
      const mockItems = [
        { block_id: "child1", block_type: 2 },
        { block_id: "child2", block_type: 4 },
      ];
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield { items: mockItems };
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.getWithIterator.mockResolvedValue(mockIterator);

      const result = await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
      });

      expect(mockClient.docx.v1.documentBlockChildren.getWithIterator).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123", block_id: "block456" },
          params: { with_descendants: true },
        },
        { userId: 123 }
      );
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify({ items: mockItems }, null, 2),
          },
        ],
        structuredContent: { items: mockItems },
      });
    });
  });

  describe("error handling", () => {
    it("should return error when client is missing", async () => {
      const result = await listDocumentBlocks.callback(
        { ...mockContext, client: undefined },
        { document_id: "doc123" }
      );

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Feishu client is required",
          },
        ],
        isError: true,
      });
    });

    it("should handle SDK exceptions", async () => {
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.getWithIterator.mockRejectedValue(
        new Error("Network error")
      );

      const result = await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Network error",
          },
        ],
        isError: true,
      });
    });

    it("should handle string errors", async () => {
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.getWithIterator.mockRejectedValue("String error");

      const result = await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: String error",
          },
        ],
        isError: true,
      });
    });

    it("should handle rate limit error", async () => {
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.getWithIterator.mockRejectedValue(
        new Error("API error: 99991400 - Rate limit exceeded")
      );

      const result = await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "应用频率限制：已超过每秒 5 次的调用上限。请使用指数退避算法降低调用速率后重试。\n错误信息: API error: 99991400 - Rate limit exceeded",
          },
        ],
        isError: true,
      });
    });
  });

  describe("parameter handling", () => {
    it("should handle all optional parameters", async () => {
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield { items: [{ block_id: "block1" }] };
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.getWithIterator.mockResolvedValue(mockIterator);

      await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        document_revision_id: 5,
        user_id_type: "union_id",
      });

      expect(mockClient.docx.v1.documentBlockChildren.getWithIterator).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123", block_id: "block456" },
          params: {
            document_revision_id: 5,
            user_id_type: "union_id",
            with_descendants: true,
          },
        },
        { userId: 123 }
      );
    });

    it("should collect items from multiple pages", async () => {
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield { items: [{ block_id: "block1" }] };
          yield { items: [{ block_id: "block2" }] };
          yield { items: [{ block_id: "block3" }] };
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.getWithIterator.mockResolvedValue(mockIterator);

      const result = await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              items: [
                { block_id: "block1" },
                { block_id: "block2" },
                { block_id: "block3" },
              ],
            }, null, 2),
          },
        ],
        structuredContent: {
          items: [
            { block_id: "block1" },
            { block_id: "block2" },
            { block_id: "block3" },
          ],
        },
      });
    });
  });
});
