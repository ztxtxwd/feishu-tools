import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateSpreadsheet } from "../../../../src/tools/sheets/update-spreadsheet.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("updateSpreadsheet", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(updateSpreadsheet.name).toBe("update_spreadsheet");
    });

    it("should have description", () => {
      expect(updateSpreadsheet.description).toBeDefined();
      expect(updateSpreadsheet.description).toContain("电子表格");
    });

    it("should have inputSchema defined", () => {
      expect(updateSpreadsheet.inputSchema).toBeDefined();
      expect(updateSpreadsheet.inputSchema.spreadsheet_token).toBeDefined();
      expect(updateSpreadsheet.inputSchema.title).toBeDefined();
    });

    it("should have outputSchema defined", () => {
      expect(updateSpreadsheet.outputSchema).toBeDefined();
      expect(updateSpreadsheet.outputSchema?.success).toBeDefined();
    });
  });

  describe("callback - context validation", () => {
    it("should return error when client is undefined", async () => {
      const context: FeishuContext = {};
      const args = { spreadsheet_token: "test_token" };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Feishu client is required" },
      ]);
    });

    it("should return error when client is null-ish", async () => {
      const context: FeishuContext = { client: undefined };
      const args = { spreadsheet_token: "test_token" };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

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
              patch: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should update spreadsheet title successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {},
      };
      mockClient.sheets.v3.spreadsheet.patch.mockResolvedValue(mockResponse);

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        title: "Sales sheet",
      };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual({
        success: true,
      });
      expect(result.structuredContent).toEqual({ success: true });
    });

    it("should call API with correct path and data parameters", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockResolvedValue({
        code: 0,
        data: {},
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        title: "New Title",
      };

      await updateSpreadsheet.callback(context, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheet.patch).toHaveBeenCalledWith(
        {
          path: {
            spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
          },
          data: {
            title: "New Title",
          },
        },
        undefined
      );
    });

    it("should handle empty title (rename to 未命名表格)", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockResolvedValue({
        code: 0,
        data: {},
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        title: undefined,
      };

      await updateSpreadsheet.callback(context, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheet.patch).toHaveBeenCalledWith(
        {
          path: {
            spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
          },
          data: {
            title: undefined,
          },
        },
        undefined
      );
    });

    it("should pass user access token when provided as string", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockResolvedValue({
        code: 0,
        data: {},
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: "static_user_token",
      };

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        title: "New Title",
      };

      await updateSpreadsheet.callback(contextWithToken, args, mockExtra);

      // Should be called with a second argument (the withUserAccessToken result)
      expect(mockClient.sheets.v3.spreadsheet.patch).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should pass user access token when provided as async function", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockResolvedValue({
        code: 0,
        data: {},
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: async () => "async_function_token",
      };

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        title: "New Title",
      };

      await updateSpreadsheet.callback(contextWithToken, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheet.patch).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
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
              patch: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should return error when API returns non-zero code with msg", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockResolvedValue({
        code: 1310214,
        msg: "SpreadSheet Not Found",
        data: null,
      });

      const args = {
        spreadsheet_token: "invalid_token",
        title: "New Title",
      };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "SpreadSheet Not Found" }]);
    });

    it("should return error code when API returns non-zero code without msg", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockResolvedValue({
        code: 1310214,
        msg: "",
        data: null,
      });

      const args = {
        spreadsheet_token: "invalid_token",
        title: "New Title",
      };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "API error: 1310214" },
      ]);
    });

    it("should handle rate limit error (99991400)", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockResolvedValue({
        code: 99991400,
        msg: "rate limit exceeded",
        data: null,
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        title: "New Title",
      };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain("频率限制");
      expect(text).toContain("20 次");
    });

    it("should handle rate limit error in catch block", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockRejectedValue(
        new Error("99991400 rate limit exceeded")
      );

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        title: "New Title",
      };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain("频率限制");
    });

    it("should handle API throwing an exception", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockRejectedValue(
        new Error("Network error")
      );

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        title: "New Title",
      };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Network error" },
      ]);
    });

    it("should handle permission denied error", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockResolvedValue({
        code: 1310213,
        msg: "Permission Fail",
        data: null,
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        title: "New Title",
      };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Permission Fail" }]);
    });

    it("should handle non-Error thrown objects", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockRejectedValue("string error");

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
        title: "New Title",
      };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: string error" },
      ]);
    });

    it("should handle spreadsheet deleted error", async () => {
      mockClient.sheets.v3.spreadsheet.patch.mockResolvedValue({
        code: 1310249,
        msg: "Spreadsheet Deleted",
        data: null,
      });

      const args = {
        spreadsheet_token: "deleted_token",
        title: "New Title",
      };

      const result = await updateSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Spreadsheet Deleted" }]);
    });
  });
});
