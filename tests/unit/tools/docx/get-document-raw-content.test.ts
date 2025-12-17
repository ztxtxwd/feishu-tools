import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDocumentRawContent } from "../../../../src/tools/docx/get-document-raw-content.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("getDocumentRawContent", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(getDocumentRawContent.name).toBe("get_document_raw_content");
    });

    it("should have description", () => {
      expect(getDocumentRawContent.description).toBeDefined();
      expect(getDocumentRawContent.description).toContain("纯文本");
    });

    it("should have inputSchema defined", () => {
      expect(getDocumentRawContent.inputSchema).toBeDefined();
      expect(getDocumentRawContent.inputSchema.document_id).toBeDefined();
      expect(getDocumentRawContent.inputSchema.lang).toBeDefined();
    });

    it("should have outputSchema defined", () => {
      expect(getDocumentRawContent.outputSchema).toBeDefined();
      expect(getDocumentRawContent.outputSchema?.content).toBeDefined();
    });
  });

  describe("callback - context validation", () => {
    it("should return error when client is undefined", async () => {
      const context: FeishuContext = {};
      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
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
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
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
              rawContent: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should get document raw content successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          content:
            "云文档\n多人实时协同，插入一切元素。不仅是在线文档，更是强大的创作和互动工具\n云文档：专为协作而生\n",
        },
      };
      mockClient.docx.v1.document.rawContent.mockResolvedValue(mockResponse);

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
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

    it("should call API with correct parameters without lang", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 0,
        data: {
          content: "Test content",
        },
      });

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      await getDocumentRawContent.callback(context, args, mockExtra);

      expect(mockClient.docx.v1.document.rawContent).toHaveBeenCalledWith(
        {
          path: {
            document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
          },
          params: {
            lang: undefined,
          },
        },
        undefined
      );
    });

    it("should call API with lang parameter", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 0,
        data: {
          content: "Test content with @Min Zhang",
        },
      });

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
        lang: 1,
      };

      await getDocumentRawContent.callback(context, args, mockExtra);

      expect(mockClient.docx.v1.document.rawContent).toHaveBeenCalledWith(
        {
          path: {
            document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
          },
          params: {
            lang: 1,
          },
        },
        undefined
      );
    });

    it("should pass user access token when provided as string", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 0,
        data: {
          content: "Test content",
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: "static_user_token",
      };

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      await getDocumentRawContent.callback(contextWithToken, args, mockExtra);

      // Should be called with a second argument (the withUserAccessToken result)
      expect(mockClient.docx.v1.document.rawContent).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should pass user access token when provided as sync function", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 0,
        data: {
          content: "Test content",
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: () => "sync_function_token",
      };

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      await getDocumentRawContent.callback(contextWithToken, args, mockExtra);

      expect(mockClient.docx.v1.document.rawContent).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should pass user access token when provided as async function", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 0,
        data: {
          content: "Test content",
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: async () => "async_function_token",
      };

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      await getDocumentRawContent.callback(contextWithToken, args, mockExtra);

      expect(mockClient.docx.v1.document.rawContent).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should handle empty content", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 0,
        data: {
          content: "",
        },
      });

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(
        (result.content[0] as { text: string }).text
      );
      expect(parsedContent.content).toBe("");
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
              rawContent: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should return error when API returns non-zero code with msg", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 1770002,
        msg: "not found",
        data: null,
      });

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "not found" }]);
    });

    it("should return error code when API returns non-zero code without msg", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 1770001,
        msg: "",
        data: null,
      });

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "API error: 1770001" },
      ]);
    });

    it("should handle API throwing an exception", async () => {
      mockClient.docx.v1.document.rawContent.mockRejectedValue(
        new Error("Network error")
      );

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Network error" },
      ]);
    });

    it("should handle permission denied error", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 1770032,
        msg: "forbidden",
        data: null,
      });

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "forbidden" }]);
    });

    it("should handle resource deleted error", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 1770003,
        msg: "resource deleted",
        data: null,
      });

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "resource deleted" },
      ]);
    });

    it("should handle raw content size exceed limited error", async () => {
      mockClient.docx.v1.document.rawContent.mockResolvedValue({
        code: 1770033,
        msg: "raw content size exceed limited",
        data: null,
      });

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
        context,
        args,
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "raw content size exceed limited" },
      ]);
    });

    it("should handle non-Error thrown objects", async () => {
      mockClient.docx.v1.document.rawContent.mockRejectedValue("string error");

      const args = {
        document_id: "doxbcmEtbFrbbq10nPNu8gabcef",
      };

      const result = await getDocumentRawContent.callback(
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
