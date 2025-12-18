import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addSheet } from "../../../../src/tools/sheets/add-sheet.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("addSheet", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(addSheet.name).toBe("add_sheet");
    });

    it("should have description", () => {
      expect(addSheet.description).toBeDefined();
      expect(addSheet.description).toContain("新增");
    });

    it("should have inputSchema defined", () => {
      expect(addSheet.inputSchema).toBeDefined();
      expect(addSheet.inputSchema.spreadsheet_token).toBeDefined();
      expect(addSheet.inputSchema.title).toBeDefined();
      expect(addSheet.inputSchema.index).toBeDefined();
    });
  });

  describe("callback - token validation", () => {
    it("should return error when no token is provided", async () => {
      const context: FeishuContext = {};
      const args = {
        spreadsheet_token: "sheet123",
        title: "New Sheet",
      };

      const result = await addSheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toContain("Access token is required");
    });
  });

  describe("callback - successful API calls", () => {
    it("should add sheet successfully with required params only", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              addSheet: {
                properties: {
                  sheetId: "newSheetId",
                  title: "New Sheet",
                  index: 0,
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
        title: "New Sheet",
      };

      const result = await addSheet.callback(context, args, mockExtra);

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
                addSheet: {
                  properties: {
                    title: "New Sheet",
                  },
                },
              },
            ],
          }),
        }
      );
    });

    it("should add sheet successfully with index specified", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          replies: [
            {
              addSheet: {
                properties: {
                  sheetId: "newSheetId",
                  title: "New Sheet",
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
        title: "New Sheet",
        index: 2,
      };

      const result = await addSheet.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: "New Sheet",
                    index: 2,
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
        title: "New Sheet",
      };

      await addSheet.callback(context, args, mockExtra);

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
          msg: "Invalid spreadsheet token",
        }),
      });

      const context: FeishuContext = {
        getTenantAccessToken: "token",
      };
      const args = {
        spreadsheet_token: "invalid",
        title: "New Sheet",
      };

      const result = await addSheet.callback(context, args, mockExtra);

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
        title: "New Sheet",
      };

      const result = await addSheet.callback(context, args, mockExtra);

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
        title: "New Sheet",
      };

      const result = await addSheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const content = JSON.parse((result.content[0] as { text: string }).text);
      expect(content.error).toBe("Network error");
    });
  });
});
