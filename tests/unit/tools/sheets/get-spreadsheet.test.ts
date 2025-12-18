import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSpreadsheet } from "../../../../src/tools/sheets/get-spreadsheet.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("getSpreadsheet", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(getSpreadsheet.name).toBe("get_spreadsheet");
    });

    it("should have description", () => {
      expect(getSpreadsheet.description).toBeDefined();
      expect(getSpreadsheet.description).toContain("电子表格");
    });

    it("should have inputSchema defined", () => {
      expect(getSpreadsheet.inputSchema).toBeDefined();
      expect(getSpreadsheet.inputSchema.spreadsheet_token).toBeDefined();
      expect(getSpreadsheet.inputSchema.user_id_type).toBeDefined();
    });

    it("should have outputSchema defined", () => {
      expect(getSpreadsheet.outputSchema).toBeDefined();
      expect(getSpreadsheet.outputSchema?.spreadsheet).toBeDefined();
    });
  });

  describe("callback - context validation", () => {
    it("should return error when client is undefined", async () => {
      const context: FeishuContext = {};
      const args = { spreadsheet_token: "test_token" };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Feishu client is required" },
      ]);
    });

    it("should return error when client is null-ish", async () => {
      const context: FeishuContext = { client: undefined };
      const args = { spreadsheet_token: "test_token" };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
    });
  });

  describe("callback - successful API calls", () => {
    let mockClient: any;
    let context: FeishuContext;

    beforeEach(() => {
      mockClient = {
        sheets: {
          v3: {
            spreadsheet: {
              get: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should get spreadsheet info successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          spreadsheet: {
            title: "Test Spreadsheet",
            owner_id: "ou_48d0958ee4b2ab3eaf0b5f6c968abcef",
            token: "Iow7sNNEphp3WbtnbCscPqabcef",
            url: "https://example.feishu.cn/sheets/Iow7sNNEphp3WbtnbCscPqabcef",
          },
        },
      };
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue(mockResponse);

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
        mockResponse.data
      );
      expect(result.structuredContent).toEqual(mockResponse.data);
    });

    it("should call API with correct path parameter", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 0,
        data: {
          spreadsheet: {
            token: "test_token",
          },
        },
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      await getSpreadsheet.callback(context, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheet.get).toHaveBeenCalledWith(
        {
          path: {
            spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
          },
          params: {},
        },
        undefined
      );
    });

    it("should call API with user_id_type parameter", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 0,
        data: {
          spreadsheet: {
            token: "test_token",
          },
        },
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        user_id_type: "user_id" as const,
      };

      await getSpreadsheet.callback(context, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheet.get).toHaveBeenCalledWith(
        {
          path: {
            spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
          },
          params: {
            user_id_type: "user_id",
          },
        },
        undefined
      );
    });

    it("should pass user access token when provided as string", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 0,
        data: {
          spreadsheet: {
            token: "test_token",
          },
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: "static_user_token",
      };

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      await getSpreadsheet.callback(contextWithToken, args, mockExtra);

      // Should be called with a second argument (the withUserAccessToken result)
      expect(mockClient.sheets.v3.spreadsheet.get).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should pass user access token when provided as async function", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 0,
        data: {
          spreadsheet: {
            token: "test_token",
          },
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: async () => "async_function_token",
      };

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      await getSpreadsheet.callback(contextWithToken, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheet.get).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should use cleanParams to filter undefined values", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 0,
        data: {
          spreadsheet: {
            token: "test_token",
          },
        },
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        user_id_type: undefined,
      };

      await getSpreadsheet.callback(context, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheet.get).toHaveBeenCalledWith(
        {
          path: {
            spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
          },
          params: {},
        },
        undefined
      );
    });
  });

  describe("callback - API error handling", () => {
    let mockClient: any;
    let context: FeishuContext;

    beforeEach(() => {
      mockClient = {
        sheets: {
          v3: {
            spreadsheet: {
              get: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should return error when API returns non-zero code with msg", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 1310214,
        msg: "SpreadSheet Not Found",
        data: null,
      });

      const args = {
        spreadsheet_token: "invalid_token",
      };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "SpreadSheet Not Found" }]);
    });

    it("should return error code when API returns non-zero code without msg", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 1310214,
        msg: "",
        data: null,
      });

      const args = {
        spreadsheet_token: "invalid_token",
      };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "API error: 1310214" },
      ]);
    });

    it("should handle rate limit error (99991400)", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 99991400,
        msg: "rate limit exceeded",
        data: null,
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain("频率限制");
      expect(text).toContain("100 次");
    });

    it("should handle rate limit error in catch block", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockRejectedValue(
        new Error("99991400 rate limit exceeded")
      );

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain("频率限制");
    });

    it("should handle API throwing an exception", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockRejectedValue(
        new Error("Network error")
      );

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Network error" },
      ]);
    });

    it("should handle permission denied error", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 1310213,
        msg: "Permission Fail",
        data: null,
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Permission Fail" }]);
    });

    it("should handle non-Error thrown objects", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockRejectedValue("string error");

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: string error" },
      ]);
    });

    it("should handle spreadsheet deleted error", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 1310249,
        msg: "Spreadsheet Deleted",
        data: null,
      });

      const args = {
        spreadsheet_token: "deleted_token",
      };

      const result = await getSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Spreadsheet Deleted" }]);
    });
  });
});
