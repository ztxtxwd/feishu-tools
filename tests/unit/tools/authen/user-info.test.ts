import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserInfo } from "../../../../src/tools/authen/user-info.js";
import type { FeishuContext } from "../../../../src/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// Mock extra parameter
const mockExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("getUserInfo", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(getUserInfo.name).toBe("get_user_info");
    });

    it("should have description", () => {
      expect(getUserInfo.description).toBeDefined();
      expect(getUserInfo.description).toContain("用户");
    });

    it("should have inputSchema defined", () => {
      expect(getUserInfo.inputSchema).toBeDefined();
    });

    it("should have outputSchema defined", () => {
      expect(getUserInfo.outputSchema).toBeDefined();
    });
  });

  describe("callback - context validation", () => {
    it("should return error when client is undefined", async () => {
      const context: FeishuContext = {};

      const result = await getUserInfo.callback(context, {}, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Feishu client is required" },
      ]);
    });

    it("should return error when client is null-ish", async () => {
      const context: FeishuContext = { client: undefined };

      const result = await getUserInfo.callback(context, {}, mockExtra);

      expect(result.isError).toBe(true);
    });

    it("should return error when user access token is not provided", async () => {
      const mockClient = {
        authen: {
          v1: {
            userInfo: {
              get: vi.fn(),
            },
          },
        },
      };
      const context: FeishuContext = { client: mockClient as any };

      const result = await getUserInfo.callback(context, {}, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: User access token is required" },
      ]);
    });
  });

  describe("callback - successful API calls", () => {
    let mockClient: any;
    let context: FeishuContext;

    beforeEach(() => {
      mockClient = {
        authen: {
          v1: {
            userInfo: {
              get: vi.fn(),
            },
          },
        },
      };
    });

    it("should get user info successfully", async () => {
      const mockUserData = {
        name: "张三",
        en_name: "Zhang San",
        avatar_url: "https://example.com/avatar.png",
        email: "zhangsan@example.com",
        mobile: "+8613800138000",
        user_id: "user_123",
        open_id: "ou_xxxxx",
        union_id: "on_xxxxx",
        tenant_key: "tenant_123",
      };
      const mockResponse = {
        code: 0,
        msg: "success",
        data: mockUserData,
      };
      mockClient.authen.v1.userInfo.get.mockResolvedValue(mockResponse);

      context = {
        client: mockClient,
        getUserAccessToken: "test_user_token",
      };

      const result = await getUserInfo.callback(context, {}, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(mockUserData);
      expect(result.structuredContent).toEqual(mockUserData);
    });

    it("should call API with user access token as string", async () => {
      mockClient.authen.v1.userInfo.get.mockResolvedValue({
        code: 0,
        data: {},
      });

      context = {
        client: mockClient,
        getUserAccessToken: "static_user_token",
      };

      await getUserInfo.callback(context, {}, mockExtra);

      expect(mockClient.authen.v1.userInfo.get).toHaveBeenCalledWith(
        {},
        expect.anything()
      );
    });

    it("should call API with user access token from sync function", async () => {
      mockClient.authen.v1.userInfo.get.mockResolvedValue({
        code: 0,
        data: {},
      });

      context = {
        client: mockClient,
        getUserAccessToken: () => "sync_function_token",
      };

      await getUserInfo.callback(context, {}, mockExtra);

      expect(mockClient.authen.v1.userInfo.get).toHaveBeenCalledWith(
        {},
        expect.anything()
      );
    });

    it("should call API with user access token from async function", async () => {
      mockClient.authen.v1.userInfo.get.mockResolvedValue({
        code: 0,
        data: {},
      });

      context = {
        client: mockClient,
        getUserAccessToken: async () => "async_function_token",
      };

      await getUserInfo.callback(context, {}, mockExtra);

      expect(mockClient.authen.v1.userInfo.get).toHaveBeenCalledWith(
        {},
        expect.anything()
      );
    });

    it("should handle partial user data", async () => {
      const partialUserData = {
        name: "张三",
        open_id: "ou_xxxxx",
      };
      mockClient.authen.v1.userInfo.get.mockResolvedValue({
        code: 0,
        data: partialUserData,
      });

      context = {
        client: mockClient,
        getUserAccessToken: "test_token",
      };

      const result = await getUserInfo.callback(context, {}, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(partialUserData);
    });
  });

  describe("callback - API error handling", () => {
    let mockClient: any;
    let context: FeishuContext;

    beforeEach(() => {
      mockClient = {
        authen: {
          v1: {
            userInfo: {
              get: vi.fn(),
            },
          },
        },
      };
      context = {
        client: mockClient,
        getUserAccessToken: "test_token",
      };
    });

    it("should return error when API returns non-zero code", async () => {
      mockClient.authen.v1.userInfo.get.mockResolvedValue({
        code: 99991401,
        msg: "Invalid access token",
        data: null,
      });

      const result = await getUserInfo.callback(context, {}, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Failed to fetch user info: Invalid access token" },
      ]);
    });

    it("should handle API throwing an exception", async () => {
      mockClient.authen.v1.userInfo.get.mockRejectedValue(
        new Error("Network error")
      );

      const result = await getUserInfo.callback(context, {}, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Network error" },
      ]);
    });

    it("should handle non-Error exceptions", async () => {
      mockClient.authen.v1.userInfo.get.mockRejectedValue("Unknown error string");

      const result = await getUserInfo.callback(context, {}, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Error: Unknown error string" },
      ]);
    });
  });
});
