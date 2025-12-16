import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateSheetProperties } from "../../../../src/tools/sheets/update-sheet-properties.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("updateSheetProperties", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(updateSheetProperties.name).toBe("update_sheet_properties");
    });

    it("should have description", () => {
      expect(updateSheetProperties.description).toBeDefined();
      expect(updateSheetProperties.description).toContain("更新电子表格中工作表的属性");
    });

    it("should have inputSchema defined", () => {
      expect(updateSheetProperties.inputSchema).toBeDefined();
      expect(updateSheetProperties.inputSchema.spreadsheetToken).toBeDefined();
      expect(updateSheetProperties.inputSchema.sheetId).toBeDefined();
    });

    it("should have outputSchema defined", () => {
      expect(updateSheetProperties.outputSchema).toBeDefined();
      expect(updateSheetProperties.outputSchema?.replies).toBeDefined();
    });
  });

  describe("callback - context validation", () => {
    it("should return error when no token is provided", async () => {
      const context: FeishuContext = {};

      const result = await updateSheetProperties.callback(
        context,
        { spreadsheetToken: "token", sheetId: "sheet1" },
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: "text",
        text: "Error: Access token is required (user_access_token or tenant_access_token)",
      });
    });
  });

  describe("callback - successful API calls", () => {
    it("should update sheet title successfully with user access token", async () => {
      const mockData = {
        replies: [
          {
            updateSheet: {
              properties: {
                sheetId: "sheet1",
                title: "New Title",
              },
            },
          },
        ],
      };
      const mockResponse = {
        code: 0,
        msg: "Success",
        data: mockData,
      };
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const context: FeishuContext = {
        getUserAccessToken: "user_token_123",
      };

      const result = await updateSheetProperties.callback(
        context,
        { spreadsheetToken: "shtcng123", sheetId: "sheet1", title: "New Title" },
        mockExtra
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/shtcng123/sheets_batch_update",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Authorization": "Bearer user_token_123",
            "Content-Type": "application/json; charset=utf-8",
          },
        })
      );
    });

    it("should use tenant access token when user access token is not provided", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ code: 0, data: {} }),
      });

      const context: FeishuContext = {
        getTenantAccessToken: "tenant_token_123",
      };

      await updateSheetProperties.callback(
        context,
        { spreadsheetToken: "shtcng123", sheetId: "sheet1" },
        mockExtra
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Authorization": "Bearer tenant_token_123",
          }),
        })
      );
    });

    it("should prefer user access token over tenant access token", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ code: 0, data: {} }),
      });

      const context: FeishuContext = {
        getUserAccessToken: "user_token",
        getTenantAccessToken: "tenant_token",
      };

      await updateSheetProperties.callback(
        context,
        { spreadsheetToken: "shtcng123", sheetId: "sheet1" },
        mockExtra
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Authorization": "Bearer user_token",
          }),
        })
      );
    });

    it("should include user_id_type in URL when provided", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ code: 0, data: {} }),
      });

      const context: FeishuContext = {
        getUserAccessToken: "token",
      };

      await updateSheetProperties.callback(
        context,
        { spreadsheetToken: "shtcng123", sheetId: "sheet1", userIdType: "open_id" },
        mockExtra
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/shtcng123/sheets_batch_update?user_id_type=open_id",
        expect.any(Object)
      );
    });

    it("should send correct request body with all properties", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ code: 0, data: {} }),
      });

      const context: FeishuContext = {
        getUserAccessToken: "token",
      };

      await updateSheetProperties.callback(
        context,
        {
          spreadsheetToken: "shtcng123",
          sheetId: "sheet1",
          title: "Sales Sheet",
          index: 2,
          hidden: true,
          frozenRowCount: 3,
          frozenColCount: 2,
          protect: {
            lock: "LOCK",
            lockInfo: "Protected data",
            userIDs: ["ou_123", "ou_456"],
          },
        },
        mockExtra
      );

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody).toEqual({
        requests: [
          {
            updateSheet: {
              properties: {
                sheetId: "sheet1",
                title: "Sales Sheet",
                index: 2,
                hidden: true,
                frozenRowCount: 3,
                frozenColCount: 2,
                protect: {
                  lock: "LOCK",
                  lockInfo: "Protected data",
                  userIDs: ["ou_123", "ou_456"],
                },
              },
            },
          },
        ],
      });
    });

    it("should support token provider as async function", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ code: 0, data: {} }),
      });

      const context: FeishuContext = {
        getUserAccessToken: async () => "async_token",
      };

      await updateSheetProperties.callback(
        context,
        { spreadsheetToken: "shtcng123", sheetId: "sheet1" },
        mockExtra
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Authorization": "Bearer async_token",
          }),
        })
      );
    });
  });

  describe("callback - error handling", () => {
    it("should return error when API returns non-zero code", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          code: 90002,
          msg: "Permission denied",
        }),
      });

      const context: FeishuContext = {
        getUserAccessToken: "token",
      };

      const result = await updateSheetProperties.callback(
        context,
        { spreadsheetToken: "shtcng123", sheetId: "sheet1" },
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: "text",
        text: "Error: Permission denied (code: 90002)",
      });
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const context: FeishuContext = {
        getUserAccessToken: "token",
      };

      const result = await updateSheetProperties.callback(
        context,
        { spreadsheetToken: "shtcng123", sheetId: "sheet1" },
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: "text",
        text: "Error: Network error",
      });
    });

    it("should handle non-Error exceptions", async () => {
      mockFetch.mockRejectedValue("Unknown error");

      const context: FeishuContext = {
        getUserAccessToken: "token",
      };

      const result = await updateSheetProperties.callback(
        context,
        { spreadsheetToken: "shtcng123", sheetId: "sheet1" },
        mockExtra
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: "text",
        text: "Error: Unknown error",
      });
    });
  });
});
