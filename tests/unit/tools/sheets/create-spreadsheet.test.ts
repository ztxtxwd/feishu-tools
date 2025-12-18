import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSpreadsheet } from "../../../../src/tools/sheets/create-spreadsheet.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("createSpreadsheet", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(createSpreadsheet.name).toBe("create_spreadsheet");
    });

    it("should have description", () => {
      expect(createSpreadsheet.description).toBeDefined();
      expect(createSpreadsheet.description).toContain("电子表格");
    });

    it("should have inputSchema defined", () => {
      expect(createSpreadsheet.inputSchema).toBeDefined();
      expect(createSpreadsheet.inputSchema.title).toBeDefined();
      expect(createSpreadsheet.inputSchema.folder_token).toBeDefined();
    });

    it("should have outputSchema defined", () => {
      expect(createSpreadsheet.outputSchema).toBeDefined();
      expect(createSpreadsheet.outputSchema?.spreadsheet).toBeDefined();
    });
  });

  describe("callback - context validation", () => {
    it("should return error when client is undefined", async () => {
      const context: FeishuContext = {};
      const args = {};

      const result = await createSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Feishu client is required" },
      ]);
    });

    it("should return error when client is null-ish", async () => {
      const context: FeishuContext = { client: undefined };
      const args = {};

      const result = await createSpreadsheet.callback(context, args, mockExtra);

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
              create: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should create spreadsheet successfully with all params", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          spreadsheet: {
            title: "Sales sheet",
            folder_token: "fldbcO1UuPz8VwnpPx5a92abcef",
            url: "https://example.feishu.cn/sheets/Iow7sNNEphp3WbtnbCscPqabcef",
            spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
          },
        },
      };
      mockClient.sheets.v3.spreadsheet.create.mockResolvedValue(mockResponse);

      const args = {
        title: "Sales sheet",
        folder_token: "fldbcO1UuPz8VwnpPx5a92abcef",
      };

      const result = await createSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
        mockResponse.data
      );
      expect(result.structuredContent).toEqual(mockResponse.data);
    });

    it("should create spreadsheet successfully without params (root folder)", async () => {
      const mockResponse = {
        code: 0,
        msg: "success",
        data: {
          spreadsheet: {
            title: "",
            folder_token: "",
            url: "https://example.feishu.cn/sheets/Iow7sNNEphp3WbtnbCscPqabcef",
            spreadsheet_token: "Iow7sNNEphp3WbtnbCscPqabcef",
          },
        },
      };
      mockClient.sheets.v3.spreadsheet.create.mockResolvedValue(mockResponse);

      const args = {};

      const result = await createSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(mockClient.sheets.v3.spreadsheet.create).toHaveBeenCalledWith(
        {
          data: {},
        },
        undefined
      );
    });

    it("should call API with correct parameters", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockResolvedValue({
        code: 0,
        data: {
          spreadsheet: {
            title: "Test Sheet",
            spreadsheet_token: "test_token",
          },
        },
      });

      const args = {
        title: "Test Sheet",
        folder_token: "folder123",
      };

      await createSpreadsheet.callback(context, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheet.create).toHaveBeenCalledWith(
        {
          data: {
            title: "Test Sheet",
            folder_token: "folder123",
          },
        },
        undefined
      );
    });

    it("should pass user access token when provided as string", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockResolvedValue({
        code: 0,
        data: {
          spreadsheet: {
            spreadsheet_token: "test_token",
          },
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: "static_user_token",
      };

      const args = {
        title: "Test Sheet",
      };

      await createSpreadsheet.callback(contextWithToken, args, mockExtra);

      // Should be called with a second argument (the withUserAccessToken result)
      expect(mockClient.sheets.v3.spreadsheet.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should pass user access token when provided as async function", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockResolvedValue({
        code: 0,
        data: {
          spreadsheet: {
            spreadsheet_token: "test_token",
          },
        },
      });

      const contextWithToken: FeishuContext = {
        client: mockClient,
        getUserAccessToken: async () => "async_function_token",
      };

      const args = {
        title: "Test Sheet",
      };

      await createSpreadsheet.callback(contextWithToken, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheet.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.anything()
      );
    });

    it("should use cleanParams to filter undefined values", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockResolvedValue({
        code: 0,
        data: {
          spreadsheet: {
            spreadsheet_token: "test_token",
          },
        },
      });

      const args = {
        title: "Test Sheet",
        folder_token: undefined,
      };

      await createSpreadsheet.callback(context, args, mockExtra);

      expect(mockClient.sheets.v3.spreadsheet.create).toHaveBeenCalledWith(
        {
          data: {
            title: "Test Sheet",
          },
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
              create: vi.fn(),
            },
          },
        },
      };
      context = { client: mockClient };
    });

    it("should return error when API returns non-zero code with msg", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockResolvedValue({
        code: 1310204,
        msg: "Wrong Request Body",
        data: null,
      });

      const args = {
        title: "Test Sheet",
      };

      const result = await createSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Wrong Request Body" }]);
    });

    it("should return error code when API returns non-zero code without msg", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockResolvedValue({
        code: 1310204,
        msg: "",
        data: null,
      });

      const args = {
        title: "Test Sheet",
      };

      const result = await createSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "API error: 1310204" },
      ]);
    });

    it("should handle rate limit error (99991400)", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockResolvedValue({
        code: 99991400,
        msg: "rate limit exceeded",
        data: null,
      });

      const args = {
        title: "Test Sheet",
      };

      const result = await createSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain("频率限制");
      expect(text).toContain("20 次");
    });

    it("should handle rate limit error in catch block", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockRejectedValue(
        new Error("99991400 rate limit exceeded")
      );

      const args = {
        title: "Test Sheet",
      };

      const result = await createSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain("频率限制");
    });

    it("should handle API throwing an exception", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockRejectedValue(
        new Error("Network error")
      );

      const args = {
        title: "Test Sheet",
      };

      const result = await createSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Network error" },
      ]);
    });

    it("should handle permission denied error", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockResolvedValue({
        code: 1310213,
        msg: "Permission Fail",
        data: null,
      });

      const args = {
        title: "Test Sheet",
      };

      const result = await createSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Permission Fail" }]);
    });

    it("should handle non-Error thrown objects", async () => {
      mockClient.sheets.v3.spreadsheet.create.mockRejectedValue("string error");

      const args = {
        title: "Test Sheet",
      };

      const result = await createSpreadsheet.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: string error" },
      ]);
    });
  });
});
