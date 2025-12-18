import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deleteSheet } from "../../../../src/tools/sheets/delete-sheet.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("deleteSheet", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(deleteSheet.name).toBe("delete_sheet");
    });

    it("should have description", () => {
      expect(deleteSheet.description).toBeDefined();
      expect(deleteSheet.description).toContain("删除");
    });

    it("should have inputSchema defined", () => {
      expect(deleteSheet.inputSchema).toBeDefined();
      expect(deleteSheet.inputSchema.spreadsheet_token).toBeDefined();
      expect(deleteSheet.inputSchema.sheet_id).toBeDefined();
    });
  });

  describe("callback - token validation", () => {
    it("should return error when no token is provided", async () => {
      const context: FeishuContext = {};
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetToDelete",
      };

      const result = await deleteSheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("Access token is required");
    });
  });

  describe("callback - successful API calls", () => {
    it("should delete sheet successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              deleteSheet: {
                result: true,
                sheetId: "sheetToDelete",
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
        sheet_id: "sheetToDelete",
      };

      const result = await deleteSheet.callback(context, args, mockExtra);

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
                deleteSheet: {
                  sheetId: "sheetToDelete",
                },
              },
            ],
          }),
        }
      );
    });

    it("should prefer user access token over tenant access token", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              deleteSheet: {
                result: true,
                sheetId: "sheetToDelete",
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const context: FeishuContext = {
        getUserAccessToken: "user_token",
        getTenantAccessToken: "tenant_token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetToDelete",
      };

      await deleteSheet.callback(context, args, mockExtra);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Authorization": "Bearer user_token",
          }),
        })
      );
    });

    it("should return structuredContent on success", async () => {
      const mockData = {
        replies: [
          {
            deleteSheet: {
              result: true,
              sheetId: "sheetToDelete",
            },
          },
        ],
      };
      const mockResponse = {
        code: 0,
        msg: "success",
        data: mockData,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetToDelete",
      };

      const result = await deleteSheet.callback(context, args, mockExtra);

      expect(result.structuredContent).toEqual(mockData);
    });
  });

  describe("callback - API error handling", () => {
    it("should return error when API returns non-zero code", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          code: 1001,
          msg: "Sheet not found",
        }),
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "nonExistentId",
      };

      const result = await deleteSheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toBe("Sheet not found");
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
        sheet_id: "sheetToDelete",
      };

      const result = await deleteSheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("频率限制");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetToDelete",
      };

      const result = await deleteSheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toBe("Network error");
    });

    it("should handle rate limit in error message", async () => {
      mockFetch.mockRejectedValueOnce(new Error("99991400: rate limit"));

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetToDelete",
      };

      const result = await deleteSheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("频率限制");
    });
  });
});
