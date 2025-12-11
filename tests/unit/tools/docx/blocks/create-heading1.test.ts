import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHeading1Block } from "../../../../../src/tools/docx/blocks/create-heading1.js";
import type { FeishuContext } from "../../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("createHeading1Block", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(createHeading1Block.name).toBe("create_heading1_block");
    });

    it("should have description", () => {
      expect(createHeading1Block.description).toBeDefined();
      expect(createHeading1Block.description).toContain("一级标题");
    });

    it("should have inputSchema defined", () => {
      expect(createHeading1Block.inputSchema).toBeDefined();
    });
  });

  describe("callback - context validation", () => {
    it("should return error when client is undefined", async () => {
      const context: FeishuContext = {};
      const args = {
        document_id: "doc123",
        block_id: "block456",
        index: 0,
        text: "Test Heading",
      };

      const result = await createHeading1Block.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Feishu client is required" },
      ]);
    });

    it("should return error when client is null-ish", async () => {
      const context: FeishuContext = { client: undefined };
      const args = {
        document_id: "doc123",
        block_id: "block456",
        index: 0,
        text: "Test Heading",
      };

      const result = await createHeading1Block.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
    });
  });

  describe("callback - successful API calls", () => {
    let mockClient: any;
    let context: FeishuContext;

    beforeEach(() => {
      mockClient = {
        docx: {
          v1: {
            documentBlockChildren: {
              create: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should create heading1 block successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          children: [{ block_id: "new_block_123", block_type: 4 }],
          document_revision_id: 100,
        },
      };
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockResponse);

      const args = {
        document_id: "doc123",
        block_id: "block456",
        index: 0,
        text: "My Heading",
      };

      const result = await createHeading1Block.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
        mockResponse.data
      );
    });

    it("should call API with correct parameters", async () => {
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue({
        code: 0,
        data: {},
      });

      const args = {
        document_id: "test_doc_id",
        block_id: "test_block_id",
        index: 5,
        text: "Heading Text Content",
      };

      await createHeading1Block.callback(context, args, mockExtra);

      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        {
          path: {
            document_id: "test_doc_id",
            block_id: "test_block_id",
          },
          params: {
            document_revision_id: -1,
          },
          data: {
            index: 5,
            children: [
              {
                block_type: 3,
                heading1: {
                  elements: [
                    {
                      text_run: {
                        content: "Heading Text Content",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        undefined
      );
    });

    it("should handle empty text", async () => {
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue({
        code: 0,
        data: { children: [] },
      });

      const args = {
        document_id: "doc123",
        block_id: "block456",
        index: 0,
        text: "",
      };

      const result = await createHeading1Block.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            children: [
              expect.objectContaining({
                heading1: {
                  elements: [{ text_run: { content: "" } }],
                },
              }),
            ],
          }),
        }),
        undefined
      );
    });

    it("should handle special characters in text", async () => {
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue({
        code: 0,
        data: { children: [] },
      });

      const specialText = '特殊字符 <script>alert("xss")</script> & "quotes" 中文标题';
      const args = {
        document_id: "doc123",
        block_id: "block456",
        index: 0,
        text: specialText,
      };

      const result = await createHeading1Block.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            children: [
              expect.objectContaining({
                heading1: {
                  elements: [{ text_run: { content: specialText } }],
                },
              }),
            ],
          }),
        }),
        undefined
      );
    });
  });

  describe("callback - API error handling", () => {
    let mockClient: any;
    let context: FeishuContext;

    beforeEach(() => {
      mockClient = {
        docx: {
          v1: {
            documentBlockChildren: {
              create: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should return error when API returns non-zero code with msg", async () => {
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue({
        code: 99991400,
        msg: "Invalid document_id",
        data: null,
      });

      const args = {
        document_id: "invalid_doc",
        block_id: "block456",
        index: 0,
        text: "Test",
      };

      const result = await createHeading1Block.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Invalid document_id" },
      ]);
    });

    it("should return error code when API returns non-zero code without msg", async () => {
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue({
        code: 99991401,
        msg: "",
        data: null,
      });

      const args = {
        document_id: "doc123",
        block_id: "block456",
        index: 0,
        text: "Test",
      };

      const result = await createHeading1Block.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "API error: 99991401" },
      ]);
    });

    it("should handle API throwing an exception", async () => {
      mockClient.docx.v1.documentBlockChildren.create.mockRejectedValue(
        new Error("Network error")
      );

      const args = {
        document_id: "doc123",
        block_id: "block456",
        index: 0,
        text: "Test",
      };

      const result = await createHeading1Block.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Network error" },
      ]);
    });
  });
});
