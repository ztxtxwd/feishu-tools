import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateSheetMetadata } from "../../../../src/tools/sheets/update-sheet-metadata.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("updateSheetMetadata", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(updateSheetMetadata.name).toBe("update_sheet_metadata");
    });

    it("should have description", () => {
      expect(updateSheetMetadata.description).toBeDefined();
      expect(updateSheetMetadata.description).toContain("元数据");
    });

    it("should have inputSchema defined", () => {
      expect(updateSheetMetadata.inputSchema).toBeDefined();
      expect(updateSheetMetadata.inputSchema.spreadsheet_token).toBeDefined();
      expect(updateSheetMetadata.inputSchema.sheet_id).toBeDefined();
      expect(updateSheetMetadata.inputSchema.title).toBeDefined();
    });
  });

  describe("callback - token validation", () => {
    it("should return error when no token is provided", async () => {
      const context: FeishuContext = {};
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        title: "New Title",
      };

      const result = await updateSheetMetadata.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("Access token is required");
    });
  });

  describe("callback - successful API calls", () => {
    it("should update sheet title successfully with tenant access token", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              updateSheet: {
                properties: {
                  sheetId: "sheetId456",
                  title: "New Title",
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
        title: "New Title",
      };

      const result = await updateSheetMetadata.callback(context, args, mockExtra);

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
                    title: "New Title",
                  },
                },
              },
            ],
          }),
        }
      );
    });

    it("should update sheet title successfully with user access token", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              updateSheet: {
                properties: {
                  sheetId: "sheetId456",
                  title: "Updated Title",
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
        getUserAccessToken: "user_token_123",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        title: "Updated Title",
      };

      const result = await updateSheetMetadata.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Authorization": "Bearer user_token_123",
          }),
        })
      );
    });

    it("should prefer user access token over tenant access token", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: { replies: [] },
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
        sheet_id: "sheetId456",
        title: "Title",
      };

      await updateSheetMetadata.callback(context, args, mockExtra);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Authorization": "Bearer user_token",
          }),
        })
      );
    });

    it("should support async token provider", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: { replies: [] },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const context: FeishuContext = {
        getUserAccessToken: async () => "async_token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        title: "Title",
      };

      await updateSheetMetadata.callback(context, args, mockExtra);

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

  describe("callback - API error handling", () => {
    it("should return error when API returns non-zero code", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          code: 1001,
          msg: "Invalid spreadsheet token",
        }),
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "invalid",
        sheet_id: "sheetId456",
        title: "Title",
      };

      const result = await updateSheetMetadata.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toBe("Invalid spreadsheet token");
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
        title: "Title",
      };

      const result = await updateSheetMetadata.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("频率限制");
      expect(content.error).toContain("100 次");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        title: "Title",
      };

      const result = await updateSheetMetadata.callback(context, args, mockExtra);

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
        sheet_id: "sheetId456",
        title: "Title",
      };

      const result = await updateSheetMetadata.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("频率限制");
    });
  });
});
