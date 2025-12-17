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
        documentBlock: {
          list: vi.fn(),
          listWithIterator: vi.fn(),
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
      expect(listDocumentBlocks.description).toContain("获取文档所有块的富文本内容");
    });

    it("should have correct input schema", () => {
      const schema = listDocumentBlocks.inputSchema;
      expect(schema).toHaveProperty("document_id");
      expect(schema).toHaveProperty("page_size");
      expect(schema).toHaveProperty("page_token");
      expect(schema).toHaveProperty("document_revision_id");
      expect(schema).toHaveProperty("user_id_type");
    });

    it("should have correct output schema", () => {
      const schema = listDocumentBlocks.outputSchema;
      expect(schema).toHaveProperty("items");
      expect(schema).toHaveProperty("page_token");
      expect(schema).toHaveProperty("has_more");
    });
  });

  describe("callback with iterator mode (no page_token)", () => {
    it("should use iterator when page_token is not provided", async () => {
      const mockItems = [
        { block_id: "block1", block_type: 2 },
        { block_id: "block2", block_type: 4 },
      ];
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const item of mockItems) {
            yield item;
          }
        },
      };

      (resolveToken as any).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlock.listWithIterator.mockResolvedValue(mockIterator);

      const result = await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
      });

      expect(resolveToken).toHaveBeenCalledWith(mockContext.getUserAccessToken);
      expect(lark.withUserAccessToken).toHaveBeenCalledWith("user_access_token");
      expect(mockClient.docx.v1.documentBlock.listWithIterator).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123" },
          params: {
            page_size: 500,
            document_revision_id: -1,
            user_id_type: undefined,
          },
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

    it("should use custom page_size when provided", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          items: [{ block_id: "block1" }],
          page_token: "next_page_token",
          has_more: true,
        },
      };

      (resolveToken as any).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlock.list.mockResolvedValue(mockResponse);

      const result = await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
        page_size: 100,
      });

      expect(mockClient.docx.v1.documentBlock.list).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123" },
          params: {
            page_size: 100,
            document_revision_id: -1,
            user_id_type: undefined,
          },
        },
        { userId: 123 }
      );

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockResponse.data, null, 2),
          },
        ],
        structuredContent: mockResponse.data,
      });
    });

    it("should use tenant access token when user token is not available", async () => {
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield { block_id: "block1" };
        },
      };

      (resolveToken as any)
        .mockResolvedValueOnce(undefined) // user token
        .mockResolvedValueOnce("tenant_access_token"); // tenant token

      mockClient.docx.v1.documentBlock.listWithIterator.mockResolvedValue(mockIterator);

      await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
      });

      expect(mockClient.docx.v1.documentBlock.listWithIterator).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
    });
  });

  describe("callback with manual pagination (page_token provided)", () => {
    it("should use manual pagination when page_token is provided", async () => {
      const mockResponse = {
        code: 0,
        data: {
          items: [{ block_id: "block1", block_type: 2 }],
          page_token: "next_page_token",
          has_more: true,
        },
      };

      (resolveToken as any).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlock.list.mockResolvedValue(mockResponse);

      const result = await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
        page_token: "current_page_token",
        page_size: 50,
      });

      expect(mockClient.docx.v1.documentBlock.list).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123" },
          params: {
            page_size: 50,
            page_token: "current_page_token",
            document_revision_id: -1,
            user_id_type: undefined,
          },
        },
        { userId: 123 }
      );
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockResponse.data, null, 2),
          },
        ],
        structuredContent: mockResponse.data,
      });
    });

    it("should handle API error response", async () => {
      const mockErrorResponse = {
        code: 1770002,
        msg: "not found",
      };

      (resolveToken as any).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlock.list.mockResolvedValue(mockErrorResponse);

      const result = await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
        page_token: "token",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "not found",
          },
        ],
        isError: true,
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
      (resolveToken as any).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlock.listWithIterator.mockRejectedValue(
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
      (resolveToken as any).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlock.listWithIterator.mockRejectedValue("String error");

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
  });

  describe("parameter handling", () => {
    it("should handle all optional parameters in iterator mode", async () => {
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield { block_id: "block1" };
        },
      };

      (resolveToken as any).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlock.listWithIterator.mockResolvedValue(mockIterator);

      // 不提供 page_size 和 page_token，使用迭代器模式
      await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
        document_revision_id: 5,
        user_id_type: "union_id",
      });

      expect(mockClient.docx.v1.documentBlock.listWithIterator).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123" },
          params: {
            page_size: 500, // 默认值
            document_revision_id: 5,
            user_id_type: "union_id",
          },
        },
        { userId: 123 }
      );
    });

    it("should handle all optional parameters in manual pagination mode", async () => {
      const mockResponse = { code: 0, data: { items: [] } };

      (resolveToken as any).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlock.list.mockResolvedValue(mockResponse);

      await listDocumentBlocks.callback(mockContext, {
        document_id: "doc123",
        page_token: "token",
        page_size: 100,
        document_revision_id: 10,
        user_id_type: "user_id",
      });

      expect(mockClient.docx.v1.documentBlock.list).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123" },
          params: {
            page_size: 100,
            page_token: "token",
            document_revision_id: 10,
            user_id_type: "user_id",
          },
        },
        { userId: 123 }
      );
    });
  });
});