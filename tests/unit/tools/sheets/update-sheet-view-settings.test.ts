import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateSheetViewSettings } from "../../../../src/tools/sheets/update-sheet-view-settings.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("updateSheetViewSettings", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(updateSheetViewSettings.name).toBe("update_sheet_view_settings");
    });

    it("should have description", () => {
      expect(updateSheetViewSettings.description).toBeDefined();
      expect(updateSheetViewSettings.description).toContain("视图");
    });

    it("should have inputSchema defined", () => {
      expect(updateSheetViewSettings.inputSchema).toBeDefined();
      expect(updateSheetViewSettings.inputSchema.spreadsheet_token).toBeDefined();
      expect(updateSheetViewSettings.inputSchema.sheet_id).toBeDefined();
      expect(updateSheetViewSettings.inputSchema.index).toBeDefined();
      expect(updateSheetViewSettings.inputSchema.hidden).toBeDefined();
      expect(updateSheetViewSettings.inputSchema.frozen_row_count).toBeDefined();
      expect(updateSheetViewSettings.inputSchema.frozen_col_count).toBeDefined();
    });
  });

  describe("callback - token validation", () => {
    it("should return error when no token is provided", async () => {
      const context: FeishuContext = {};
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        index: 0,
      };

      const result = await updateSheetViewSettings.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("Access token is required");
    });
  });

  describe("callback - parameter validation", () => {
    it("should return error when no properties are provided", async () => {
      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
      };

      const result = await updateSheetViewSettings.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("至少需要提供一个");
    });
  });

  describe("callback - successful API calls", () => {
    it("should update sheet index successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              updateSheet: {
                properties: {
                  sheetId: "sheetId456",
                  index: 2,
                },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const context: FeishuContext = {
        getTenantAccessToken: "tenant_token_123",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        index: 2,
      };

      const result = await updateSheetViewSettings.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/sheet123/sheets_batch_update",
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer tenant_token_123",
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            requests: [
              {
                updateSheet: {
                  properties: {
                    sheetId: "sheetId456",
                    index: 2,
                  },
                },
              },
            ],
          }),
        }
      );
    });

    it("should update hidden property successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              updateSheet: {
                properties: {
                  sheetId: "sheetId456",
                  hidden: true,
                },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        hidden: true,
      };

      const result = await updateSheetViewSettings.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
      expect(body.requests[0].updateSheet.properties.hidden).toBe(true);
    });

    it("should update frozen row and column counts successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              updateSheet: {
                properties: {
                  sheetId: "sheetId456",
                  frozenRowCount: 3,
                  frozenColCount: 2,
                },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        frozen_row_count: 3,
        frozen_col_count: 2,
      };

      const result = await updateSheetViewSettings.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
      expect(body.requests[0].updateSheet.properties.frozenRowCount).toBe(3);
      expect(body.requests[0].updateSheet.properties.frozenColCount).toBe(2);
    });

    it("should update multiple properties at once", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: { replies: [] },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        index: 1,
        hidden: false,
        frozen_row_count: 2,
        frozen_col_count: 1,
      };

      const result = await updateSheetViewSettings.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
      const properties = body.requests[0].updateSheet.properties;
      expect(properties.index).toBe(1);
      expect(properties.hidden).toBe(false);
      expect(properties.frozenRowCount).toBe(2);
      expect(properties.frozenColCount).toBe(1);
    });

    it("should allow unfreezing rows and columns with 0", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: { replies: [] },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        frozen_row_count: 0,
        frozen_col_count: 0,
      };

      const result = await updateSheetViewSettings.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
      expect(body.requests[0].updateSheet.properties.frozenRowCount).toBe(0);
      expect(body.requests[0].updateSheet.properties.frozenColCount).toBe(0);
    });
  });

  describe("callback - API error handling", () => {
    it("should return error when API returns non-zero code", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          code: 1001,
          msg: "Invalid sheet ID",
        }),
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "invalid",
        index: 0,
      };

      const result = await updateSheetViewSettings.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toBe("Invalid sheet ID");
      expect(content.code).toBe(1001);
    });

    it("should handle rate limit error (99991400)", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          code: 99991400,
          msg: "rate limit exceeded",
        }),
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        hidden: true,
      };

      const result = await updateSheetViewSettings.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("频率限制");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        index: 0,
      };

      const result = await updateSheetViewSettings.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toBe("Connection refused");
    });
  });
});
