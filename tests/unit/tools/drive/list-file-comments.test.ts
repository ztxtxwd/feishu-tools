import { describe, it, expect, vi, beforeEach } from "vitest";
import { listFileComments } from "../../../../src/tools/drive/list-file-comments.js";

describe("listFileComments", () => {
  // Mock client
  const mockList = vi.fn();
  const mockClient = {
    drive: {
      v1: {
        fileComment: {
          list: mockList,
        },
      },
    },
  } as unknown as import("@larksuiteoapi/node-sdk").Client;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(listFileComments.name).toBe("list_file_comments");
    });

    it("should have description", () => {
      expect(listFileComments.description).toBeDefined();
    });

    it("should have inputSchema", () => {
      expect(listFileComments.inputSchema).toBeDefined();
    });

    it("should have outputSchema", () => {
      expect(listFileComments.outputSchema).toBeDefined();
    });
  });

  describe("context validation", () => {
    it("should return error when client is not provided", async () => {
      const result = await listFileComments.callback(
        {},
        { file_token: "test_token", file_type: "docx" }
      );
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Feishu client is required");
    });
  });

  describe("successful calls", () => {
    it("should call SDK with correct parameters", async () => {
      const mockData = {
        has_more: false,
        items: [
          {
            comment_id: "123",
            user_id: "ou_xxx",
            is_solved: false,
            is_whole: true,
            reply_list: {
              replies: [
                {
                  reply_id: "456",
                  content: {
                    elements: [{ type: "text_run", text_run: { text: "test comment" } }],
                  },
                },
              ],
            },
          },
        ],
      };

      mockList.mockResolvedValue({
        code: 0,
        data: mockData,
      });

      const result = await listFileComments.callback(
        { client: mockClient },
        {
          file_token: "XIHSdYSI7oMEU1xrsnxc8fabcef",
          file_type: "docx",
          is_whole: false,
          is_solved: false,
          page_size: 10,
          user_id_type: "open_id",
        }
      );

      expect(result.isError).toBeUndefined();
      expect(mockList).toHaveBeenCalledWith(
        {
          path: { file_token: "XIHSdYSI7oMEU1xrsnxc8fabcef" },
          params: {
            file_type: "docx",
            is_whole: false,
            is_solved: false,
            page_size: 10,
            user_id_type: "open_id",
          },
        },
        undefined
      );
      expect(result.structuredContent).toEqual(mockData);
    });

    it("should not include undefined optional params (cleanParams)", async () => {
      mockList.mockResolvedValue({ code: 0, data: { items: [] } });

      await listFileComments.callback(
        { client: mockClient },
        { file_token: "test_token", file_type: "docx" }
      );

      // Verify cleanParams removes undefined values
      const callArgs = mockList.mock.calls[0][0];
      expect(callArgs.params).toEqual({ file_type: "docx" });
      expect(callArgs.params).not.toHaveProperty("is_whole");
      expect(callArgs.params).not.toHaveProperty("is_solved");
      expect(callArgs.params).not.toHaveProperty("page_token");
      expect(callArgs.params).not.toHaveProperty("page_size");
      expect(callArgs.params).not.toHaveProperty("user_id_type");
    });

    it("should handle pagination parameters", async () => {
      mockList.mockResolvedValue({
        code: 0,
        data: {
          has_more: true,
          page_token: "next_page_token",
          items: [],
        },
      });

      const result = await listFileComments.callback(
        { client: mockClient },
        {
          file_token: "test_token",
          file_type: "sheet",
          page_token: "current_page_token",
          page_size: 50,
        }
      );

      expect(result.isError).toBeUndefined();
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            page_token: "current_page_token",
            page_size: 50,
          }),
        }),
        undefined
      );
    });
  });

  describe("error handling", () => {
    it("should handle API error", async () => {
      mockList.mockResolvedValue({
        code: 1069302,
        msg: "param error",
      });

      const result = await listFileComments.callback(
        { client: mockClient },
        { file_token: "test_token", file_type: "docx" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("param error");
    });

    it("should handle rate limit error (99991400)", async () => {
      mockList.mockResolvedValue({
        code: 99991400,
        msg: "rate limit exceeded",
      });

      const result = await listFileComments.callback(
        { client: mockClient },
        { file_token: "test_token", file_type: "docx" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("频率限制");
    });

    it("should handle forbidden error (1069303)", async () => {
      mockList.mockResolvedValue({
        code: 1069303,
        msg: "forbidden",
      });

      const result = await listFileComments.callback(
        { client: mockClient },
        { file_token: "test_token", file_type: "docx" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("forbidden");
    });

    it("should handle exception", async () => {
      mockList.mockRejectedValue(new Error("Network error"));

      const result = await listFileComments.callback(
        { client: mockClient },
        { file_token: "test_token", file_type: "docx" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Network error");
    });

    it("should handle rate limit in exception message", async () => {
      mockList.mockRejectedValue(new Error("99991400: rate limit exceeded"));

      const result = await listFileComments.callback(
        { client: mockClient },
        { file_token: "test_token", file_type: "docx" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("频率限制");
    });
  });
});
