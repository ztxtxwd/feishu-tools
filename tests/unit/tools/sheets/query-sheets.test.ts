import { describe, it, expect, vi, beforeEach } from "vitest";
import { querySheets } from "../../../../src/tools/sheets/query-sheets.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("querySheets", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(querySheets.name).toBe("query_sheets");
    });

    it("should have description", () => {
      expect(querySheets.description).toBeDefined();
      expect(querySheets.description).toContain("工作表");
    });

    it("should have inputSchema defined", () => {
      expect(querySheets.inputSchema).toBeDefined();
      expect(querySheets.inputSchema.spreadsheet_token).toBeDefined();
    });

    it("should have outputSchema defined", () => {
      expect(querySheets.outputSchema).toBeDefined();
      expect(querySheets.outputSchema?.sheets).toBeDefined();
    });
  });

  describe("callback - context validation", () => {
    it("should return error when client is undefined", async () => {
      const context: FeishuContext = {};
      const args = { spreadsheet_token: "test_token" };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Feishu client is required" },
      ]);
    });

    it("should return error when client is null-ish", async () => {
      const context: FeishuContext = { client: undefined };
      const args = { spreadsheet_token: "test_token" };

      const result = await querySheets.callback(context, args, mockExtra);

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
            spreadsheetSheet: {
              query: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should get sheets list successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          sheets: [
            {
              sheet_id: "sxj5ws",
              title: "Sheet1",
              index: 0,
              hidden: false,
              grid_properties: {
                frozen_row_count: 0,
                frozen_column_count: 0,
                row_count: 200,
                column_count: 20,
              },
              resource_type: "sheet",
              merges: [],
            },
            {
              sheet_id: "abc123",
              title: "Sheet2",
              index: 1,
              hidden: true,
              grid_properties: {
                frozen_row_count: 1,
                frozen_column_count: 2,
                row_count: 100,
                column_count: 10,
              },
              resource_type: "sheet",
              merges: [
                {
                  start_row_index: 0,
                  end_row_index: 1,
                  start_column_index: 0,
                  end_column_index: 2,
                },
              ],
            },
          ],
        },
      };
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue(mockResponse);

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
        mockResponse.data
      );
      expect(result.structuredContent).toEqual(mockResponse.data);
    });

    it("should call API with correct path parameter", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue({
        code: 0,
        data: {
          sheets: [],
        },
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      await querySheets.callback(context, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheetSheet.query).toHaveBeenCalledWith(
        {
          path: {
            spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
          },
        },
        undefined
      );
    });

    it("should handle spreadsheet with bitable type sheets", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          sheets: [
            {
              sheet_id: "bitable_sheet",
              title: "Bitable Sheet",
              index: 0,
              hidden: false,
              resource_type: "bitable",
            },
          ],
        },
      };
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue(mockResponse);

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(mockResponse.data);
    });

    it("should pass user access token when provided as string", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue({
        code: 0,
        data: {
          sheets: [],
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: "static_user_token",
      };

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      await querySheets.callback(contextWithToken, args, mockExtra);

      // Should be called with a second argument (the withUserAccessToken result)
      expect(mockClient.sheets.v3.spreadsheetSheet.query).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should pass user access token when provided as async function", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue({
        code: 0,
        data: {
          sheets: [],
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: async () => "async_function_token",
      };

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      await querySheets.callback(contextWithToken, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheetSheet.query).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should handle empty sheets array", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          sheets: [],
        },
      };
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue(mockResponse);

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ sheets: [] });
    });
  });

  describe("callback - API error handling", () => {
    let mockClient: any;
    let context: FeishuContext;

    beforeEach(() => {
      mockClient = {
        sheets: {
          v3: {
            spreadsheetSheet: {
              query: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should return error when API returns non-zero code with msg", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue({
        code: 1310214,
        msg: "SpreadSheet Not Found",
        data: null,
      });

      const args = {
        spreadsheet_token: "invalid_token",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "SpreadSheet Not Found" }]);
    });

    it("should return error code when API returns non-zero code without msg", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue({
        code: 1310214,
        msg: "",
        data: null,
      });

      const args = {
        spreadsheet_token: "invalid_token",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "API error: 1310214" },
      ]);
    });

    it("should handle rate limit error (99991400)", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue({
        code: 99991400,
        msg: "rate limit exceeded",
        data: null,
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain("频率限制");
      expect(text).toContain("100 次");
    });

    it("should handle rate limit error in catch block", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockRejectedValue(
        new Error("99991400 rate limit exceeded")
      );

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain("频率限制");
    });

    it("should handle API throwing an exception", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockRejectedValue(
        new Error("Network error")
      );

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Network error" },
      ]);
    });

    it("should handle permission denied error", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue({
        code: 1310213,
        msg: "Permission Fail",
        data: null,
      });

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Permission Fail" }]);
    });

    it("should handle non-Error thrown objects", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockRejectedValue("string error");

      const args = {
        spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: string error" },
      ]);
    });

    it("should handle spreadsheet deleted error", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue({
        code: 1310249,
        msg: "Spreadsheet Deleted",
        data: null,
      });

      const args = {
        spreadsheet_token: "deleted_token",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Spreadsheet Deleted" }]);
    });

    it("should handle invalid parameter error", async () => {
      mockClient.sheets.v3.spreadsheetSheet.query.mockResolvedValue({
        code: 1310251,
        msg: "Invalid Parameter",
        data: null,
      });

      const args = {
        spreadsheet_token: "invalid",
      };

      const result = await querySheets.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Invalid Parameter" }]);
    });
  });
});
