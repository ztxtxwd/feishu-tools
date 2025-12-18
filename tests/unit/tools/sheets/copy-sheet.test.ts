import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copySheet } from "../../../../src/tools/sheets/copy-sheet.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("copySheet", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(copySheet.name).toBe("copy_sheet");
    });

    it("should have description", () => {
      expect(copySheet.description).toBeDefined();
      expect(copySheet.description).toContain("复制");
    });

    it("should have inputSchema defined", () => {
      expect(copySheet.inputSchema).toBeDefined();
      expect(copySheet.inputSchema.spreadsheet_token).toBeDefined();
      expect(copySheet.inputSchema.source_sheet_id).toBeDefined();
      expect(copySheet.inputSchema.title).toBeDefined();
    });
  });

  describe("callback - token validation", () => {
    it("should return error when no token is provided", async () => {
      const context: FeishuContext = {};
      const args = {
        spreadsheet_token: "sheet123",
        source_sheet_id: "sourceId",
      };

      const result = await copySheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("Access token is required");
    });
  });

  describe("callback - successful API calls", () => {
    it("should copy sheet successfully with required params only", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              copySheet: {
                properties: {
                  sheetId: "copiedSheetId",
                  title: "Sheet1(副本_0)",
                  index: 1,
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
        source_sheet_id: "sourceId",
      };

      const result = await copySheet.callback(context, args, mockExtra);

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
                copySheet: {
                  source: {
                    sheetId: "sourceId",
                  },
                  destination: {},
                },
              },
            ],
          }),
        }
      );
    });

    it("should copy sheet successfully with custom title", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              copySheet: {
                properties: {
                  sheetId: "copiedSheetId",
                  title: "Custom Copy",
                  index: 1,
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
        source_sheet_id: "sourceId",
        title: "Custom Copy",
      };

      const result = await copySheet.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            requests: [
              {
                copySheet: {
                  source: {
                    sheetId: "sourceId",
                  },
                  destination: {
                    title: "Custom Copy",
                  },
                },
              },
            ],
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
        source_sheet_id: "sourceId",
      };

      await copySheet.callback(context, args, mockExtra);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Authorization": "Bearer user_token",
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
          msg: "Invalid sheet ID",
        }),
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        source_sheet_id: "invalidId",
      };

      const result = await copySheet.callback(context, args, mockExtra);

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
        source_sheet_id: "sourceId",
      };

      const result = await copySheet.callback(context, args, mockExtra);

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
        source_sheet_id: "sourceId",
      };

      const result = await copySheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toBe("Network error");
    });
  });
});
