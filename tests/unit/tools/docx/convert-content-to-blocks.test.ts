import { describe, it, expect, vi, beforeEach } from "vitest";
import { convertContentToBlocks } from "../../../../src/tools/docx/convert-content-to-blocks.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("convertContentToBlocks", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(convertContentToBlocks.name).toBe("convert_content_to_blocks");
    });

    it("should have description", () => {
      expect(convertContentToBlocks.description).toBeDefined();
      expect(convertContentToBlocks.description).toContain("HTML");
      expect(convertContentToBlocks.description).toContain("Markdown");
    });

    it("should have inputSchema defined", () => {
      expect(convertContentToBlocks.inputSchema).toBeDefined();
      expect(convertContentToBlocks.inputSchema.content_type).toBeDefined();
      expect(convertContentToBlocks.inputSchema.content).toBeDefined();
    });

    it("should have outputSchema defined", () => {
      expect(convertContentToBlocks.outputSchema).toBeDefined();
      expect(
        convertContentToBlocks.outputSchema?.first_level_block_ids
      ).toBeDefined();
      expect(convertContentToBlocks.outputSchema?.blocks).toBeDefined();
    });
  });

  describe("callback - context validation", () => {
    it("should return error when client is undefined", async () => {
      const context: FeishuContext = {};
      const args = {
        content_type: "markdown" as const,
        content: "# Hello World",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Feishu client is required" },
      ]);
    });

    it("should return error when client is null-ish", async () => {
      const context: FeishuContext = { client: undefined };
      const args = {
        content_type: "markdown" as const,
        content: "# Hello World",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

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
            document: {
              convert: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should convert markdown content successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          first_level_block_ids: [
            "93b37f5b-8b45-4c03-9379-af988c178b19",
            "a1b2c3d4-5e6f-7890-abcd-ef1234567890",
          ],
          blocks: [
            {
              block_id: "93b37f5b-8b45-4c03-9379-af988c178b19",
              block_type: 3,
              heading1: {
                elements: [
                  {
                    text_run: {
                      content: "Hello World",
                    },
                  },
                ],
              },
            },
            {
              block_id: "a1b2c3d4-5e6f-7890-abcd-ef1234567890",
              block_type: 2,
              text: {
                elements: [
                  {
                    text_run: {
                      content: "This is a paragraph",
                    },
                  },
                ],
              },
            },
          ],
        },
      };
      mockClient.docx.v1.document.convert.mockResolvedValue(mockResponse);

      const args = {
        content_type: "markdown" as const,
        content: "# Hello World\n\nThis is a paragraph",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
        mockResponse.data
      );
      expect(result.structuredContent).toEqual(mockResponse.data);
    });

    it("should convert HTML content successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          first_level_block_ids: ["block-id-1"],
          blocks: [
            {
              block_id: "block-id-1",
              block_type: 2,
              text: {
                elements: [
                  {
                    text_run: {
                      content: "Bold text",
                      text_element_style: {
                        bold: true,
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      };
      mockClient.docx.v1.document.convert.mockResolvedValue(mockResponse);

      const args = {
        content_type: "html" as const,
        content: "<p><strong>Bold text</strong></p>",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(mockResponse.data);
    });

    it("should call API with correct parameters for markdown", async () => {
      mockClient.docx.v1.document.convert.mockResolvedValue({
        code: 0,
        data: {
          first_level_block_ids: [],
          blocks: [],
        },
      });

      const args = {
        content_type: "markdown" as const,
        content: "**Bold text**\n\n```\nCode block\n```",
      };

      await convertContentToBlocks.callback(context, args, mockExtra);

      expect(mockClient.docx.v1.document.convert).toHaveBeenCalledWith(
        {
          params: {
            user_id_type: undefined,
          },
          data: {
            content_type: "markdown",
            content: "**Bold text**\n\n```\nCode block\n```",
          },
        },
        undefined
      );
    });

    it("should pass user_id_type when provided", async () => {
      mockClient.docx.v1.document.convert.mockResolvedValue({
        code: 0,
        data: {
          first_level_block_ids: [],
          blocks: [],
        },
      });

      const args = {
        content_type: "markdown" as const,
        content: "Hello @user",
        user_id_type: "union_id" as const,
      };

      await convertContentToBlocks.callback(context, args, mockExtra);

      expect(mockClient.docx.v1.document.convert).toHaveBeenCalledWith(
        {
          params: {
            user_id_type: "union_id",
          },
          data: {
            content_type: "markdown",
            content: "Hello @user",
          },
        },
        undefined
      );
    });

    it("should pass user access token when provided as string", async () => {
      mockClient.docx.v1.document.convert.mockResolvedValue({
        code: 0,
        data: {
          first_level_block_ids: [],
          blocks: [],
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: "static_user_token",
      };

      const args = {
        content_type: "markdown" as const,
        content: "# Test",
      };

      await convertContentToBlocks.callback(contextWithToken, args, mockExtra);

      expect(mockClient.docx.v1.document.convert).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should pass user access token when provided as async function", async () => {
      mockClient.docx.v1.document.convert.mockResolvedValue({
        code: 0,
        data: {
          first_level_block_ids: [],
          blocks: [],
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: async () => "async_function_token",
      };

      const args = {
        content_type: "html" as const,
        content: "<p>Test</p>",
      };

      await convertContentToBlocks.callback(contextWithToken, args, mockExtra);

      expect(mockClient.docx.v1.document.convert).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should handle complex markdown with code blocks", async () => {
      const mockResponse = {
        code: 0,
        data: {
          first_level_block_ids: ["block-1", "block-2"],
          blocks: [
            {
              block_id: "block-1",
              block_type: 2,
              text: {
                elements: [
                  {
                    text_run: {
                      content: "First paragraph with ",
                    },
                  },
                  {
                    text_run: {
                      content: "bold",
                      text_element_style: { bold: true },
                    },
                  },
                ],
              },
            },
            {
              block_id: "block-2",
              block_type: 14,
              code: {
                style: {
                  language: 1,
                },
                elements: [
                  {
                    text_run: {
                      content: "console.log('hello')",
                    },
                  },
                ],
              },
            },
          ],
        },
      };
      mockClient.docx.v1.document.convert.mockResolvedValue(mockResponse);

      const args = {
        content_type: "markdown" as const,
        content: "First paragraph with **bold**\n\n```js\nconsole.log('hello')\n```",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent?.blocks).toHaveLength(2);
    });
  });

  describe("callback - API error handling", () => {
    let mockClient: any;
    let context: FeishuContext;

    beforeEach(() => {
      mockClient = {
        docx: {
          v1: {
            document: {
              convert: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should return error when API returns non-zero code with msg", async () => {
      mockClient.docx.v1.document.convert.mockResolvedValue({
        code: 230001,
        msg: "invalid content",
        data: null,
      });

      const args = {
        content_type: "markdown" as const,
        content: "test",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "invalid content" },
      ]);
    });

    it("should return error code when API returns non-zero code without msg", async () => {
      mockClient.docx.v1.document.convert.mockResolvedValue({
        code: 230002,
        msg: "",
        data: null,
      });

      const args = {
        content_type: "html" as const,
        content: "<p>test</p>",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "API error: 230002" },
      ]);
    });

    it("should handle rate limit error (99991400)", async () => {
      mockClient.docx.v1.document.convert.mockResolvedValue({
        code: 99991400,
        msg: "request too frequent",
        data: null,
      });

      const args = {
        content_type: "markdown" as const,
        content: "test",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        "应用频率限制"
      );
      expect((result.content[0] as { text: string }).text).toContain(
        "指数退避算法"
      );
    });

    it("should handle API throwing an exception", async () => {
      mockClient.docx.v1.document.convert.mockRejectedValue(
        new Error("Network error")
      );

      const args = {
        content_type: "markdown" as const,
        content: "test",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Network error" },
      ]);
    });

    it("should handle rate limit error in exception message", async () => {
      mockClient.docx.v1.document.convert.mockRejectedValue(
        new Error("Request failed with code 99991400")
      );

      const args = {
        content_type: "markdown" as const,
        content: "test",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        "应用频率限制"
      );
    });

    it("should handle non-Error thrown objects", async () => {
      mockClient.docx.v1.document.convert.mockRejectedValue("string error");

      const args = {
        content_type: "markdown" as const,
        content: "test",
      };

      const result = await convertContentToBlocks.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: string error" },
      ]);
    });
  });
});
