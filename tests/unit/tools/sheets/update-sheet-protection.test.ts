import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateSheetProtection } from "../../../../src/tools/sheets/update-sheet-protection.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("updateSheetProtection", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(updateSheetProtection.name).toBe("update_sheet_protection");
    });

    it("should have description", () => {
      expect(updateSheetProtection.description).toBeDefined();
      expect(updateSheetProtection.description).toContain("保护");
    });

    it("should have inputSchema defined", () => {
      expect(updateSheetProtection.inputSchema).toBeDefined();
      expect(updateSheetProtection.inputSchema.spreadsheet_token).toBeDefined();
      expect(updateSheetProtection.inputSchema.sheet_id).toBeDefined();
      expect(updateSheetProtection.inputSchema.lock).toBeDefined();
      expect(updateSheetProtection.inputSchema.lock_info).toBeDefined();
      expect(updateSheetProtection.inputSchema.user_ids).toBeDefined();
      expect(updateSheetProtection.inputSchema.user_id_type).toBeDefined();
    });
  });

  describe("callback - token validation", () => {
    it("should return error when no token is provided", async () => {
      const context: FeishuContext = {};
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        lock: "LOCK" as const,
      };

      const result = await updateSheetProtection.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("Access token is required");
    });
  });

  describe("callback - successful API calls", () => {
    it("should lock sheet successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              updateSheet: {
                properties: {
                  sheetId: "sheetId456",
                  protect: {
                    lock: "LOCK",
                  },
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
        lock: "LOCK" as const,
      };

      const result = await updateSheetProtection.callback(context, args, mockExtra);

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
                    protect: {
                      lock: "LOCK",
                    },
                  },
                },
              },
            ],
          }),
        }
      );
    });

    it("should unlock sheet successfully", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              updateSheet: {
                properties: {
                  sheetId: "sheetId456",
                  protect: {
                    lock: "UNLOCK",
                  },
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
        lock: "UNLOCK" as const,
      };

      const result = await updateSheetProtection.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
      expect(body.requests[0].updateSheet.properties.protect.lock).toBe("UNLOCK");
    });

    it("should lock sheet with lock info", async () => {
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
        lock: "LOCK" as const,
        lock_info: "Confidential data - do not edit",
      };

      const result = await updateSheetProtection.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
      expect(body.requests[0].updateSheet.properties.protect.lockInfo).toBe("Confidential data - do not edit");
    });

    it("should lock sheet with user IDs and user_id_type", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              updateSheet: {
                properties: {
                  sheetId: "sheetId456",
                  protect: {
                    lock: "LOCK",
                    userIDs: ["ou_user1", "ou_user2"],
                  },
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
        lock: "LOCK" as const,
        user_ids: ["ou_user1", "ou_user2"],
        user_id_type: "open_id" as const,
      };

      const result = await updateSheetProtection.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/sheet123/sheets_batch_update?user_id_type=open_id",
        expect.any(Object)
      );
      const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
      expect(body.requests[0].updateSheet.properties.protect.userIDs).toEqual(["ou_user1", "ou_user2"]);
    });

    it("should lock sheet with all protection options", async () => {
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
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        lock: "LOCK" as const,
        lock_info: "Important data",
        user_ids: ["on_union1"],
        user_id_type: "union_id" as const,
      };

      const result = await updateSheetProtection.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/sheet123/sheets_batch_update?user_id_type=union_id",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Authorization": "Bearer user_token",
          }),
        })
      );
      const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
      const protect = body.requests[0].updateSheet.properties.protect;
      expect(protect.lock).toBe("LOCK");
      expect(protect.lockInfo).toBe("Important data");
      expect(protect.userIDs).toEqual(["on_union1"]);
    });
  });

  describe("callback - API error handling", () => {
    it("should return error when API returns non-zero code", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          code: 1001,
          msg: "Permission denied",
        }),
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        lock: "LOCK" as const,
      };

      const result = await updateSheetProtection.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toBe("Permission denied");
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
        lock: "LOCK" as const,
      };

      const result = await updateSheetProtection.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("频率限制");
      expect(content.error).toContain("100 次");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Timeout"));

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        lock: "LOCK" as const,
      };

      const result = await updateSheetProtection.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toBe("Timeout");
    });

    it("should handle rate limit in error message", async () => {
      mockFetch.mockRejectedValueOnce(new Error("频率限制 exceeded"));

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "sheet123",
        sheet_id: "sheetId456",
        lock: "LOCK" as const,
      };

      const result = await updateSheetProtection.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("频率限制");
    });
  });
});
