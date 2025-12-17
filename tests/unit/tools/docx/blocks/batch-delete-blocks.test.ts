import { describe, it, expect, vi, beforeEach } from "vitest";
import { batchDeleteBlocks } from "../../../../../src/tools/docx/blocks/batch-delete-blocks.js";
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

describe("batchDeleteBlocks", () => {
  const mockClient = {
    docx: {
      v1: {
        documentBlockChildren: {
          batchDelete: vi.fn(),
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
      expect(batchDeleteBlocks.name).toBe("batch_delete_blocks");
    });

    it("should have description", () => {
      expect(batchDeleteBlocks.description).toBeDefined();
      expect(batchDeleteBlocks.description).toContain("删除指定块的子块");
    });

    it("should have correct input schema", () => {
      const schema = batchDeleteBlocks.inputSchema;
      expect(schema).toHaveProperty("document_id");
      expect(schema).toHaveProperty("block_id");
      expect(schema).toHaveProperty("start_index");
      expect(schema).toHaveProperty("end_index");
      expect(schema).toHaveProperty("document_revision_id");
      expect(schema).toHaveProperty("client_token");
    });

    it("should have correct output schema", () => {
      const schema = batchDeleteBlocks.outputSchema;
      expect(schema).toHaveProperty("document_revision_id");
      expect(schema).toHaveProperty("client_token");
    });
  });

  describe("callback - successful deletion", () => {
    it("should delete blocks successfully with required parameters", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          document_revision_id: 2,
          client_token: "generated-token-123",
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockResolvedValue(mockResponse);

      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doxcnePuYufKa49ISjhD8Ih0ikh",
        block_id: "doxcnO6UW6wAw2qIcYf4hZpFIth",
        start_index: 0,
        end_index: 2,
      });

      expect(resolveToken).toHaveBeenCalledWith(mockContext.getUserAccessToken);
      expect(lark.withUserAccessToken).toHaveBeenCalledWith("user_access_token");
      expect(mockClient.docx.v1.documentBlockChildren.batchDelete).toHaveBeenCalledWith(
        {
          path: {
            document_id: "doxcnePuYufKa49ISjhD8Ih0ikh",
            block_id: "doxcnO6UW6wAw2qIcYf4hZpFIth",
          },
          params: {
            document_revision_id: -1,
          },
          data: {
            start_index: 0,
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

    it("should delete blocks with all optional parameters", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          document_revision_id: 6,
          client_token: "custom-token-456",
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockResolvedValue(mockResponse);

      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 1,
        end_index: 5,
        document_revision_id: 5,
        client_token: "custom-token-456",
      });

      expect(mockClient.docx.v1.documentBlockChildren.batchDelete).toHaveBeenCalledWith(
        {
          path: {
            document_id: "doc123",
            block_id: "block456",
          },
          params: {
            document_revision_id: 5,
            client_token: "custom-token-456",
          },
          data: {
            start_index: 1,
            end_index: 5,
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
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          document_revision_id: 2,
          client_token: "token",
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockResolvedValue(mockResponse);

      await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 0,
        end_index: 1,
      });

      expect(mockClient.docx.v1.documentBlockChildren.batchDelete).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
    });
  });

  describe("callback - validation errors", () => {
    it("should return error when client is missing", async () => {
      const result = await batchDeleteBlocks.callback(
        { ...mockContext, client: undefined },
        {
          document_id: "doc123",
          block_id: "block456",
          start_index: 0,
          end_index: 1,
        }
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

    it("should return error when start_index >= end_index", async () => {
      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 5,
        end_index: 3,
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: start_index 必须小于 end_index",
          },
        ],
        isError: true,
      });
    });

    it("should return error when start_index equals end_index", async () => {
      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 3,
        end_index: 3,
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: start_index 必须小于 end_index",
          },
        ],
        isError: true,
      });
    });
  });

  describe("callback - API errors", () => {
    it("should handle API error response", async () => {
      const mockErrorResponse = {
        code: 1770002,
        msg: "not found",
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockResolvedValue(mockErrorResponse);

      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 0,
        end_index: 1,
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

    it("should handle invalid param error", async () => {
      const mockErrorResponse = {
        code: 1770001,
        msg: "invalid param",
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockResolvedValue(mockErrorResponse);

      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 0,
        end_index: 100,
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "invalid param",
          },
        ],
        isError: true,
      });
    });

    it("should handle block not support to delete children error", async () => {
      const mockErrorResponse = {
        code: 1770031,
        msg: "block not support to delete children",
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockResolvedValue(mockErrorResponse);

      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "table-block",
        start_index: 0,
        end_index: 1,
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "block not support to delete children",
          },
        ],
        isError: true,
      });
    });

    it("should handle permission denied error", async () => {
      const mockErrorResponse = {
        code: 1770032,
        msg: "forbidden",
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockResolvedValue(mockErrorResponse);

      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 0,
        end_index: 1,
      });

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
      const mockResponse = {
        code: 99991400,
        msg: "请求过于频繁",
        data: null,
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockResolvedValue(mockResponse);

      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 0,
        end_index: 1,
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "应用频率限制：已超过每秒 3 次的调用上限。请使用指数退避算法降低调用速率后重试。\n错误码: 99991400\n错误信息: 请求过于频繁",
          },
        ],
        isError: true,
      });
    });

    it("should handle rate limit error in exception", async () => {
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockRejectedValue(
        new Error("API error: 99991400 - Rate limit exceeded")
      );

      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 0,
        end_index: 1,
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "应用频率限制：已超过每秒 3 次的调用上限。请使用指数退避算法降低调用速率后重试。\n错误信息: API error: 99991400 - Rate limit exceeded",
          },
        ],
        isError: true,
      });
    });
  });

  describe("callback - exception handling", () => {
    it("should handle SDK exceptions", async () => {
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockRejectedValue(
        new Error("Network error")
      );

      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 0,
        end_index: 1,
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
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockRejectedValue("String error");

      const result = await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 0,
        end_index: 1,
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

  describe("idempotency", () => {
    it("should support idempotent operations with client_token", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          document_revision_id: 2,
          client_token: "idempotent-token",
        },
      };

      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.batchDelete.mockResolvedValue(mockResponse);

      // First call
      await batchDeleteBlocks.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        start_index: 0,
        end_index: 1,
        client_token: "idempotent-token",
      });

      // Verify client_token is passed
      expect(mockClient.docx.v1.documentBlockChildren.batchDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            client_token: "idempotent-token",
          }),
        }),
        expect.any(Object)
      );
    });
  });
});
