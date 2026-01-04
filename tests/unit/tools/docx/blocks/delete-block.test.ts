import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteBlock } from "../../../../../src/tools/docx/blocks/delete-block.js";
import * as lark from "@larksuiteoapi/node-sdk";
import { resolveToken } from "../../../../../src/utils/token.js";
import type { FeishuContext } from "../../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";

const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

// Mock the lark SDK
vi.mock("@larksuiteoapi/node-sdk", () => ({
  withUserAccessToken: vi.fn(),
}));

// Mock the token utility
vi.mock("../../../../../src/utils/token.js", () => ({
  resolveToken: vi.fn(),
}));

describe("deleteBlock", () => {
  const mockListWithIterator = vi.fn();
  const mockBatchDelete = vi.fn();

  const mockClient = {
    docx: {
      v1: {
        documentBlock: {
          listWithIterator: mockListWithIterator,
        },
        documentBlockChildren: {
          batchDelete: mockBatchDelete,
        },
      },
    },
  };

  const mockGetUserAccessToken = vi.fn();
  const mockGetTenantAccessToken = vi.fn();

  const mockContext: FeishuContext = {
    client: mockClient as unknown as FeishuContext["client"],
    getUserAccessToken: mockGetUserAccessToken as unknown as FeishuContext["getUserAccessToken"],
    getTenantAccessToken: mockGetTenantAccessToken as unknown as FeishuContext["getTenantAccessToken"],
  };

  // Helper to create async iterator that yields pages with items
  function createAsyncIterator<T>(items: T[]): AsyncIterable<{ items: T[] }> {
    return {
      [Symbol.asyncIterator]() {
        let done = false;
        return {
          async next() {
            if (!done) {
              done = true;
              return { done: false, value: { items } };
            }
            return { done: true, value: undefined };
          },
        };
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(deleteBlock.name).toBe("delete_block");
    });

    it("should have description", () => {
      expect(deleteBlock.description).toBeDefined();
      expect(deleteBlock.description).toContain("删除飞书文档中指定的单个块");
    });

    it("should have correct input schema", () => {
      const schema = deleteBlock.inputSchema;
      expect(schema).toHaveProperty("document_id");
      expect(schema).toHaveProperty("block_id");
    });

    it("should have correct output schema", () => {
      const schema = deleteBlock.outputSchema;
      expect(schema).toHaveProperty("document_revision_id");
      expect(schema).toHaveProperty("client_token");
    });
  });

  describe("callback - successful deletion", () => {
    it("should delete block successfully", async () => {
      const mockBlocks = [
        {
          block_id: "doc-root",
          parent_id: undefined,
          children: ["block-1", "block-2", "block-3"],
        },
        { block_id: "block-1", parent_id: "doc-root", children: [] },
        { block_id: "block-2", parent_id: "doc-root", children: [] },
        { block_id: "block-3", parent_id: "doc-root", children: [] },
      ];

      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          document_revision_id: 2,
          client_token: "generated-token-123",
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));
      mockBatchDelete.mockResolvedValue(mockResponse);

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doxcnePuYufKa49ISjhD8Ih0ikh",
          block_id: "block-2",
        },
        mockExtra
      );

      expect(resolveToken).toHaveBeenCalledWith(mockContext.getUserAccessToken);
      expect(lark.withUserAccessToken).toHaveBeenCalledWith("user_access_token");
      expect(mockListWithIterator).toHaveBeenCalledWith(
        {
          path: {
            document_id: "doxcnePuYufKa49ISjhD8Ih0ikh",
          },
          params: {
            page_size: 500,
            document_revision_id: -1,
          },
        },
        { userId: 123 }
      );
      expect(mockBatchDelete).toHaveBeenCalledWith(
        {
          path: {
            document_id: "doxcnePuYufKa49ISjhD8Ih0ikh",
            block_id: "doc-root",
          },
          params: {
            document_revision_id: -1,
          },
          data: {
            start_index: 1,
            end_index: 2,
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

    it("should delete first block in parent", async () => {
      const mockBlocks = [
        {
          block_id: "doc-root",
          parent_id: undefined,
          children: ["block-1", "block-2"],
        },
        { block_id: "block-1", parent_id: "doc-root", children: [] },
        { block_id: "block-2", parent_id: "doc-root", children: [] },
      ];

      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          document_revision_id: 2,
          client_token: "token",
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));
      mockBatchDelete.mockResolvedValue(mockResponse);

      await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "block-1",
        },
        mockExtra
      );

      expect(mockBatchDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            start_index: 0,
            end_index: 1,
          },
        }),
        expect.any(Object)
      );
    });

    it("should use tenant access token when user token is not available", async () => {
      const mockBlocks = [
        {
          block_id: "doc-root",
          parent_id: undefined,
          children: ["block-1"],
        },
        { block_id: "block-1", parent_id: "doc-root", children: [] },
      ];

      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          document_revision_id: 2,
          client_token: "token",
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));
      mockBatchDelete.mockResolvedValue(mockResponse);

      await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "block-1",
        },
        mockExtra
      );

      expect(mockListWithIterator).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
      expect(mockBatchDelete).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
    });
  });

  describe("callback - validation errors", () => {
    it("should return error when client is missing", async () => {
      const result = await deleteBlock.callback(
        { ...mockContext, client: undefined },
        {
          document_id: "doc123",
          block_id: "block456",
        },
        mockExtra
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

    it("should return error when block_id not found", async () => {
      const mockBlocks = [
        {
          block_id: "doc-root",
          parent_id: undefined,
          children: ["block-1"],
        },
        { block_id: "block-1", parent_id: "doc-root", children: [] },
      ];

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "non-existent-block",
        },
        mockExtra
      );

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: 找不到指定的块 non-existent-block",
          },
        ],
        isError: true,
      });
    });

    it("should return error when block has no parent_id", async () => {
      const mockBlocks = [
        {
          block_id: "orphan-block",
          parent_id: undefined,
          children: [],
        },
      ];

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "orphan-block",
        },
        mockExtra
      );

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: 找不到块 orphan-block 的父块信息",
          },
        ],
        isError: true,
      });
    });

    it("should return error when parent block not found", async () => {
      const mockBlocks = [
        {
          block_id: "block-1",
          parent_id: "missing-parent",
          children: [],
        },
      ];

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "block-1",
        },
        mockExtra
      );

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: 找不到父块 missing-parent 或父块没有子块信息",
          },
        ],
        isError: true,
      });
    });

    it("should return error when block not in parent children list", async () => {
      const mockBlocks = [
        {
          block_id: "doc-root",
          parent_id: undefined,
          children: ["other-block"], // block-1 not in children
        },
        { block_id: "block-1", parent_id: "doc-root", children: [] },
      ];

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "block-1",
        },
        mockExtra
      );

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: 在父块 doc-root 的子块列表中找不到块 block-1",
          },
        ],
        isError: true,
      });
    });
  });

  describe("callback - API errors", () => {
    it("should handle API error response", async () => {
      const mockBlocks = [
        {
          block_id: "doc-root",
          parent_id: undefined,
          children: ["block-1"],
        },
        { block_id: "block-1", parent_id: "doc-root", children: [] },
      ];

      const mockErrorResponse = {
        code: 1770002,
        msg: "not found",
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));
      mockBatchDelete.mockResolvedValue(mockErrorResponse);

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "block-1",
        },
        mockExtra
      );

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

    it("should handle permission denied error", async () => {
      const mockBlocks = [
        {
          block_id: "doc-root",
          parent_id: undefined,
          children: ["block-1"],
        },
        { block_id: "block-1", parent_id: "doc-root", children: [] },
      ];

      const mockErrorResponse = {
        code: 1770032,
        msg: "forbidden",
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));
      mockBatchDelete.mockResolvedValue(mockErrorResponse);

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "block-1",
        },
        mockExtra
      );

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "forbidden",
          },
        ],
        isError: true,
      });
    });
  });

  describe("callback - rate limit handling", () => {
    it("should handle rate limit error response", async () => {
      const mockBlocks = [
        {
          block_id: "doc-root",
          parent_id: undefined,
          children: ["block-1"],
        },
        { block_id: "block-1", parent_id: "doc-root", children: [] },
      ];

      const mockResponse = {
        code: 99991400,
        msg: "请求过于频繁",
        data: null,
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));
      mockBatchDelete.mockResolvedValue(mockResponse);

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "block-1",
        },
        mockExtra
      );

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "应用频率限制：已超过调用频率上限。请使用指数退避算法降低调用速率后重试。\n错误码: 99991400\n错误信息: 请求过于频繁",
          },
        ],
        isError: true,
      });
    });

    it("should handle rate limit error in exception", async () => {
      const mockBlocks = [
        {
          block_id: "doc-root",
          parent_id: undefined,
          children: ["block-1"],
        },
        { block_id: "block-1", parent_id: "doc-root", children: [] },
      ];

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockResolvedValue(createAsyncIterator(mockBlocks));
      mockBatchDelete.mockRejectedValue(
        new Error("API error: 99991400 - Rate limit exceeded")
      );

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "block-1",
        },
        mockExtra
      );

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "应用频率限制：已超过调用频率上限。请使用指数退避算法降低调用速率后重试。\n错误信息: API error: 99991400 - Rate limit exceeded",
          },
        ],
        isError: true,
      });
    });
  });

  describe("callback - exception handling", () => {
    it("should handle SDK exceptions", async () => {
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockRejectedValue(new Error("Network error"));

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "block-1",
        },
        mockExtra
      );

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
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        "user_access_token"
      );
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({
        userId: 123,
      });
      mockListWithIterator.mockRejectedValue("String error");

      const result = await deleteBlock.callback(
        mockContext,
        {
          document_id: "doc123",
          block_id: "block-1",
        },
        mockExtra
      );

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
});
