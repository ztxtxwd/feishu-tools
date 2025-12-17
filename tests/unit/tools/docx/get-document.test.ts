import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDocument } from "../../../../src/tools/docx/get-document.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("getDocument", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(getDocument.name).toBe("get_document");
    });

    it("should have description", () => {
      expect(getDocument.description).toBeDefined();
      expect(getDocument.description).toContain("文档");
    });

    it("should have inputSchema defined", () => {
      expect(getDocument.inputSchema).toBeDefined();
      expect(getDocument.inputSchema.document_id).toBeDefined();
    });

    it("should have outputSchema defined", () => {
      expect(getDocument.outputSchema).toBeDefined();
      expect(getDocument.outputSchema?.document).toBeDefined();
    });
  });

  describe("callback - context validation", () => {
    it("should return error when client is undefined", async () => {
      const context: FeishuContext = {};
      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      const result = await getDocument.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Feishu client is required" },
      ]);
    });

    it("should return error when client is null-ish", async () => {
      const context: FeishuContext = { client: undefined };
      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      const result = await getDocument.callback(context, args, mockExtra);

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
              get: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should get document info successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          document: {
            document_id: "doxcni6mOy7jLRWbEylaKKabcef",
            revision_id: 1,
            title: "Test Document",
            display_setting: {
              show_authors: true,
              show_create_time: true,
              show_pv: false,
              show_uv: false,
              show_like_count: false,
              show_comment_count: false,
            },
            cover: {
              token: "D6d9bkdH7onNylxKyvucm8abcef",
              offset_ratio_x: 0,
              offset_ratio_y: 0,
            },
          },
        },
      };
      mockClient.docx.v1.document.get.mockResolvedValue(mockResponse);

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      const result = await getDocument.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
        mockResponse.data
      );
      expect(result.structuredContent).toEqual(mockResponse.data);
    });

    it("should call API with correct parameters", async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        code: 0,
        data: {
          document: {
            document_id: "test_doc_id_12345678901234",
            revision_id: 1,
            title: "Test",
          },
        },
      });

      const args = {
        document_id: "test_doc_id_12345678901234",
      };

      await getDocument.callback(context, args, mockExtra);

      expect(mockClient.docx.v1.document.get).toHaveBeenCalledWith(
        {
          path: {
            document_id: "test_doc_id_12345678901234",
          },
        },
        undefined
      );
    });

    it("should pass user access token when provided as string", async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        code: 0,
        data: {
          document: {
            document_id: "doxcnePuYufKa49ISjhD8Iabcef",
            revision_id: 1,
          },
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: "static_user_token",
      };

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      await getDocument.callback(contextWithToken, args, mockExtra);

      // Should be called with a second argument (the withUserAccessToken result)
      expect(mockClient.docx.v1.document.get).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should pass user access token when provided as sync function", async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        code: 0,
        data: {
          document: {
            document_id: "doxcnePuYufKa49ISjhD8Iabcef",
            revision_id: 1,
          },
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: () => "sync_function_token",
      };

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      await getDocument.callback(contextWithToken, args, mockExtra);

      expect(mockClient.docx.v1.document.get).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should pass user access token when provided as async function", async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        code: 0,
        data: {
          document: {
            document_id: "doxcnePuYufKa49ISjhD8Iabcef",
            revision_id: 1,
          },
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: async () => "async_function_token",
      };

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      await getDocument.callback(contextWithToken, args, mockExtra);

      expect(mockClient.docx.v1.document.get).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should handle document without optional fields", async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        code: 0,
        data: {
          document: {
            document_id: "doxcnePuYufKa49ISjhD8Iabcef",
            revision_id: 5,
          },
        },
      });

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      const result = await getDocument.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(
        (result.content[0] as { text: string }).text
      );
      expect(parsedContent.document.document_id).toBe(
        "doxcnePuYufKa49ISjhD8Iabcef"
      );
      expect(parsedContent.document.revision_id).toBe(5);
      expect(parsedContent.document.title).toBeUndefined();
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
              get: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should return error when API returns non-zero code with msg", async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        code: 1770002,
        msg: "not found",
        data: null,
      });

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      const result = await getDocument.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "not found" }]);
    });

    it("should return error code when API returns non-zero code without msg", async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        code: 1770001,
        msg: "",
        data: null,
      });

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      const result = await getDocument.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "API error: 1770001" },
      ]);
    });

    it("should handle API throwing an exception", async () => {
      mockClient.docx.v1.document.get.mockRejectedValue(
        new Error("Network error")
      );

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      const result = await getDocument.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Network error" },
      ]);
    });

    it("should handle permission denied error", async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        code: 1770032,
        msg: "forbidden",
        data: null,
      });

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      const result = await getDocument.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "forbidden" }]);
    });

    it("should handle resource deleted error", async () => {
      mockClient.docx.v1.document.get.mockResolvedValue({
        code: 1770003,
        msg: "resource deleted",
        data: null,
      });

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      const result = await getDocument.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "resource deleted" },
      ]);
    });

    it("should handle non-Error thrown objects", async () => {
      mockClient.docx.v1.document.get.mockRejectedValue("string error");

      const args = {
        document_id: "doxcnePuYufKa49ISjhD8Iabcef",
      };

      const result = await getDocument.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: string error" },
      ]);
    });
  });
});
