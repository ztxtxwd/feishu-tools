import { describe, it, expect, vi, beforeEach } from "vitest";
import { createImageBlock } from "../../../../../src/tools/docx/blocks/create-image-block.js";
import * as lark from "@larksuiteoapi/node-sdk";
import { resolveToken } from "../../../../../src/utils/token.js";
import * as fs from "fs";

// Mock the lark SDK
vi.mock("@larksuiteoapi/node-sdk", () => ({
  withUserAccessToken: vi.fn(),
}));

// Mock the token utility
vi.mock("../../../../../src/utils/token.js", () => ({
  resolveToken: vi.fn(),
}));

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Type for testing invalid inputs
type PartialInput = Partial<
  Parameters<typeof createImageBlock.callback>[1]
> & {
  document_id: string;
  block_id: string;
};

describe("createImageBlock", () => {
  const mockClient = {
    docx: {
      v1: {
        documentBlockChildren: {
          create: vi.fn(),
        },
        documentBlock: {
          patch: vi.fn(),
        },
      },
    },
    drive: {
      v1: {
        media: {
          uploadAll: vi.fn(),
        },
      },
    },
  };

  const mockContext = {
    client: mockClient,
    getUserAccessToken: vi.fn(),
    getTenantAccessToken: vi.fn(),
  };

  const mockImageBuffer = Buffer.from("fake-image-data");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(createImageBlock.name).toBe("create_image_block");
    });

    it("should have description", () => {
      expect(createImageBlock.description).toBeDefined();
      if (typeof createImageBlock.description === "object") {
        expect(createImageBlock.description.summary).toContain("图片块");
      }
    });

    it("should have correct input schema", () => {
      const schema = createImageBlock.inputSchema;
      expect(schema).toHaveProperty("document_id");
      expect(schema).toHaveProperty("block_id");
      expect(schema).toHaveProperty("index");
      expect(schema).toHaveProperty("image_path");
      expect(schema).toHaveProperty("image_content");
      expect(schema).toHaveProperty("file_name");
      expect(schema).toHaveProperty("align");
      expect(schema).toHaveProperty("caption");
    });

    it("should have correct output schema", () => {
      const schema = createImageBlock.outputSchema;
      expect(schema).toHaveProperty("image_block_id");
      expect(schema).toHaveProperty("image_token");
      expect(schema).toHaveProperty("file_name");
    });
  });

  describe("callback with image_path", () => {
    it("should create image block successfully from file path", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "img_block_123",
              block_type: 27,
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "img_token_abc",
      };

      const mockPatchResponse = {
        code: 0,
      };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "parent_block_456",
        image_path: "/path/to/image.png",
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        image_block_id: "img_block_123",
        image_token: "img_token_abc",
        file_name: "image.png",
      });
    });

    it("should use provided file_name instead of extracting from path", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [{ block_id: "img_block_123" }],
        },
      };

      const mockUploadResponse = {
        file_token: "img_token_abc",
      };

      const mockPatchResponse = { code: 0 };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "parent_block_456",
        image_path: "/path/to/original.png",
        file_name: "custom.png",
      });

      expect(result.structuredContent?.file_name).toBe("custom.png");
    });

    it("should use custom index and align when provided", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [{ block_id: "img_block_123" }],
        },
      };

      const mockUploadResponse = { file_token: "img_token_abc" };
      const mockPatchResponse = { code: 0 };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "parent_block_456",
        image_path: "/path/to/image.png",
        index: 5,
        align: 1,
      });

      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123", block_id: "parent_block_456" },
          params: { document_revision_id: -1 },
          data: {
            index: 5,
            children: [
              {
                block_type: 27,
                image: { align: 1 },
              },
            ],
          },
        },
        { userId: 123 }
      );
    });

    it("should include caption in update when provided", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [{ block_id: "img_block_123" }],
        },
      };

      const mockUploadResponse = { file_token: "img_token_abc" };
      const mockPatchResponse = { code: 0 };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "parent_block_456",
        image_path: "/path/to/image.png",
        caption: "A beautiful sunset",
      });

      expect(mockClient.docx.v1.documentBlock.patch).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123", block_id: "img_block_123" },
          params: { document_revision_id: -1 },
          data: {
            replace_image: { token: "img_token_abc" },
            update_text_elements: {
              elements: [
                {
                  text_run: {
                    content: "A beautiful sunset",
                  },
                },
              ],
            },
          },
        },
        { userId: 123 }
      );
    });
  });

  describe("callback with image_content", () => {
    it("should create image block successfully from base64 content", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [{ block_id: "img_block_456" }],
        },
      };

      const mockUploadResponse = { file_token: "img_token_xyz" };
      const mockPatchResponse = { code: 0 };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "parent_block_456",
        image_content: mockImageBuffer.toString("base64"),
        file_name: "uploaded.png",
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        image_block_id: "img_block_456",
        image_token: "img_token_xyz",
        file_name: "uploaded.png",
      });
    });
  });

  describe("error handling", () => {
    it("should return error when client is missing", async () => {
      const result = await createImageBlock.callback(
        { ...mockContext, client: undefined },
        { document_id: "doc123", block_id: "block_456", image_path: "/path/to/image.png" }
      );

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Feishu client is required",
          },
        ],
        isError: true,
      });
    });

    it("should return error when neither image_path nor image_content provided", async () => {
      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
      } as PartialInput);

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Either image_path or image_content must be provided",
          },
        ],
        isError: true,
      });
    });

    it("should return error when both image_path and image_content provided", async () => {
      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_path: "/path/to/image.png",
        image_content: "base64data",
      } as PartialInput);

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Only one of image_path or image_content should be provided, not both",
          },
        ],
        isError: true,
      });
    });

    it("should return error when image_path file does not exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_path: "/nonexistent/image.png",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Image file not found: /nonexistent/image.png",
          },
        ],
        isError: true,
      });
    });

    it("should return error when image_content used without file_name", async () => {
      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_content: "base64data",
      } as PartialInput);

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: file_name is required when using image_content",
          },
        ],
        isError: true,
      });
    });

    it("should return error when file size exceeds 20MB limit", async () => {
      const largeBuffer = Buffer.alloc(21 * 1024 * 1024); // 21MB
      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(largeBuffer);

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_path: "/path/to/large.png",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("exceeds the limit of 20MB");
    });

    it("should return error when create block API fails", async () => {
      const mockCreateResponse = {
        code: 1770002,
        msg: "not found",
      };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_path: "/path/to/image.png",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error creating image block: not found",
          },
        ],
        isError: true,
      });
    });

    it("should return error when no blocks returned from create API", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [],
        },
      };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_path: "/path/to/image.png",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No blocks returned");
    });

    it("should return error when upload API returns no response", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [{ block_id: "img_block_123" }],
        },
      };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(null);

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_path: "/path/to/image.png",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No response from upload API");
    });

    it("should return error when upload API returns no file_token", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [{ block_id: "img_block_123" }],
        },
      };

      const mockUploadResponse = {};
      const mockPatchResponse = { code: 0 };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_path: "/path/to/image.png",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Image token not returned");
    });

    it("should return error when patch API fails", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [{ block_id: "img_block_123" }],
        },
      };

      const mockUploadResponse = { file_token: "img_token_abc" };
      const mockPatchResponse = {
        code: 1770003,
        msg: "permission denied",
      };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_path: "/path/to/image.png",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error updating image block: permission denied",
          },
        ],
        isError: true,
      });
    });

    it("should handle SDK exceptions", async () => {
      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockRejectedValue(
        new Error("Network error")
      );

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_path: "/path/to/image.png",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Network error",
          },
        ],
        isError: true,
      });
    });

    it("should handle string errors", async () => {
      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockRejectedValue("String error");

      const result = await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block_456",
        image_path: "/path/to/image.png",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: String error",
          },
        ],
        isError: true,
      });
    });

    it("should use tenant access token when user token is not available", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [{ block_id: "img_block_123" }],
        },
      };
      const mockUploadResponse = { file_token: "img_token_abc" };
      const mockPatchResponse = { code: 0 };

      vi.mocked(resolveToken).mockResolvedValue(undefined);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "parent_block_456",
        image_path: "/path/to/image.png",
      });

      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
    });
  });

  describe("parameter handling", () => {
    it("should use default align value (2=center) when not provided", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [{ block_id: "img_block_123" }],
        },
      };
      const mockUploadResponse = { file_token: "img_token_abc" };
      const mockPatchResponse = { code: 0 };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "parent_block_456",
        image_path: "/path/to/image.png",
      });

      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123", block_id: "parent_block_456" },
          params: { document_revision_id: -1 },
          data: {
            children: [
              {
                block_type: 27,
                image: { align: 2 },
              },
            ],
          },
        },
        { userId: 123 }
      );
    });

    it("should use custom document_revision_id when provided", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [{ block_id: "img_block_123" }],
        },
      };
      const mockUploadResponse = { file_token: "img_token_abc" };
      const mockPatchResponse = { code: 0 };

      vi.mocked(resolveToken).mockResolvedValue("user_access_token");
      lark.withUserAccessToken.mockReturnValue({ userId: 123 });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockImageBuffer);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      await createImageBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "parent_block_456",
        image_path: "/path/to/image.png",
        document_revision_id: 10,
      });

      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        {
          path: { document_id: "doc123", block_id: "parent_block_456" },
          params: { document_revision_id: 10 },
          data: expect.any(Object),
        },
        { userId: 123 }
      );
    });
  });
});
