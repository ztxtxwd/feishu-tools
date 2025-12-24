import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFileBlock } from "../../../../../src/tools/docx/blocks/create-file-block.js";
import * as lark from "@larksuiteoapi/node-sdk";
import { resolveToken } from "../../../../../src/utils/token.js";
import * as fs from "fs";
import * as path from "path";

// Mock the lark SDK
vi.mock("@larksuiteoapi/node-sdk", () => ({
  withUserAccessToken: vi.fn(),
}));

// Mock the token utility
vi.mock("../../../../../src/utils/token.js", () => ({
  resolveToken: vi.fn(),
}));

// Mock file system modules
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("path", () => ({
  basename: vi.fn((p: string) => p.split("/").pop() || p),
}));

describe("createFileBlock", () => {
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

  const mockFileBuffer = Buffer.from("test file content");

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset path.basename to default behavior
    vi.mocked(path.basename).mockImplementation((p: string) => p.split("/").pop() || p);
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(createFileBlock.name).toBe("create_file_block");
    });

    it("should have description", () => {
      expect(createFileBlock.description).toBeDefined();
      expect(createFileBlock.description).toContain("文件块");
    });

    it("should have correct input schema", () => {
      const schema = createFileBlock.inputSchema;
      expect(schema).toHaveProperty("document_id");
      expect(schema).toHaveProperty("block_id");
      expect(schema).toHaveProperty("index");
      expect(schema).toHaveProperty("file_path");
      expect(schema).toHaveProperty("file_content");
      expect(schema).toHaveProperty("file_name");
      expect(schema).toHaveProperty("view_type");
      expect(schema).toHaveProperty("document_revision_id");
    });

    it("should have correct output schema", () => {
      const schema = createFileBlock.outputSchema;
      expect(schema).toHaveProperty("view_block_id");
      expect(schema).toHaveProperty("file_block_id");
      expect(schema).toHaveProperty("file_token");
      expect(schema).toHaveProperty("file_name");
    });
  });

  describe("callback - successful file block creation with file_path", () => {
    it("should create file block from local file path", async () => {
      const mockCreateResponse = {
        code: 0,
        msg: "success",
        data: {
          children: [
            {
              block_id: "view_block_123",
              block_type: 23,
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "file_token_abc",
      };

      const mockPatchResponse = {
        code: 0,
        msg: "success",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue("user_access_token");
      (lark.withUserAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 123 });
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doxcnePuYufKa49ISjhD8Ih0ikh",
        block_id: "doxcnO6UW6wAw2qIcYf4hZpFIth",
        file_path: "/path/to/file.pdf",
      });

      expect(fs.existsSync).toHaveBeenCalledWith("/path/to/file.pdf");
      expect(fs.readFileSync).toHaveBeenCalledWith("/path/to/file.pdf");
      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        expect.objectContaining({
          path: {
            document_id: "doxcnePuYufKa49ISjhD8Ih0ikh",
            block_id: "doxcnO6UW6wAw2qIcYf4hZpFIth",
          },
        }),
        { userId: 123 }
      );
      expect(mockClient.drive.v1.media.uploadAll).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            file_name: "file.pdf",
            parent_type: "docx_file",
            parent_node: "file_block_456",
          }),
        }),
        { userId: 123 }
      );
      expect(mockClient.docx.v1.documentBlock.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          path: {
            document_id: "doxcnePuYufKa49ISjhD8Ih0ikh",
            block_id: "file_block_456",
          },
          data: {
            replace_file: {
              token: "file_token_abc",
            },
          },
        }),
        { userId: 123 }
      );
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        view_block_id: "view_block_123",
        file_block_id: "file_block_456",
        file_token: "file_token_abc",
        file_name: "file.pdf",
      });
    });

    it("should create file block with custom file_name from file_path", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "file_token_abc",
      };

      const mockPatchResponse = { code: 0 };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/original.pdf",
        file_name: "custom.pdf",
      });

      expect(mockClient.drive.v1.media.uploadAll).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            file_name: "custom.pdf",
          }),
        }),
        undefined
      );
      expect(result.structuredContent?.file_name).toBe("custom.pdf");
    });

    it("should create file block with index parameter", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "file_token_abc",
      };

      const mockPatchResponse = { code: 0 };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
        index: 2,
      });

      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            index: 2,
          }),
        }),
        undefined
      );
    });
  });

  describe("callback - successful file block creation with file_content", () => {
    it("should create file block from base64 content", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "file_token_abc",
      };

      const mockPatchResponse = { code: 0 };

      const base64Content = mockFileBuffer.toString("base64");
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_content: base64Content,
        file_name: "document.pdf",
      });

      expect(mockClient.drive.v1.media.uploadAll).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            file_name: "document.pdf",
            file: mockFileBuffer,
          }),
        }),
        undefined
      );
      expect(result.structuredContent?.file_name).toBe("document.pdf");
    });
  });

  describe("callback - validation errors", () => {
    it("should return error when client is missing", async () => {
      const result = await createFileBlock.callback(
        { ...mockContext, client: undefined },
        {
          document_id: "doc123",
          block_id: "block456",
          file_path: "/path/to/file.pdf",
        }
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

    it("should return error when neither file_path nor file_content is provided", async () => {
      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
      } as any);

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Either file_path or file_content must be provided",
          },
        ],
        isError: true,
      });
    });

    it("should return error when both file_path and file_content are provided", async () => {
      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
        file_content: "base64content",
      } as any);

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Only one of file_path or file_content should be provided, not both",
          },
        ],
        isError: true,
      });
    });

    it("should return error when file_path file does not exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/nonexistent/file.pdf",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: File not found: /nonexistent/file.pdf",
          },
        ],
        isError: true,
      });
    });

    it("should return error when file_content is used without file_name", async () => {
      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_content: "base64content",
      } as any);

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: file_name is required when using file_content",
          },
        ],
        isError: true,
      });
    });

    it("should return error when file size exceeds 20MB limit", async () => {
      const largeBuffer = Buffer.alloc(21 * 1024 * 1024); // 21MB

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(largeBuffer);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/large.pdf",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: expect.stringContaining("exceeds the limit of 20MB"),
          },
        ],
        isError: true,
      });
    });
  });

  describe("callback - API errors", () => {
    it("should handle create block API error", async () => {
      const mockErrorResponse = {
        code: 1770002,
        msg: "document not found",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockErrorResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error creating file block: document not found",
          },
        ],
        isError: true,
      });
    });

    it("should handle empty children response from create block", async () => {
      const mockResponse = {
        code: 0,
        data: {
          children: [],
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: No blocks returned from create block API",
          },
        ],
        isError: true,
      });
    });

    it("should handle missing file block ID in response", async () => {
      const mockResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              // children is missing
            },
          ],
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: File block ID not found in response",
          },
        ],
        isError: true,
      });
    });

    it("should handle upload API error with no response", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(null);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: No response from upload API",
          },
        ],
        isError: true,
      });
    });

    it("should handle upload API error with no file_token", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {}; // No file_token

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: File token not returned from upload API",
          },
        ],
        isError: true,
      });
    });

    it("should handle patch block API error", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "file_token_abc",
      };

      const mockPatchErrorResponse = {
        code: 1770003,
        msg: "permission denied",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchErrorResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error updating file block: permission denied",
          },
        ],
        isError: true,
      });
    });
  });

  describe("callback - exception handling", () => {
    it("should handle SDK exceptions", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockRejectedValue(
        new Error("Network error")
      );

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
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
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockRejectedValue("String error");

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
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
  });

  describe("adler32 checksum calculation", () => {
    it("should calculate correct checksum for empty buffer", async () => {
      // The function is internal, but we can verify the integration works correctly
      // through successful uploads which use the checksum
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "file_token_abc",
      };

      const mockPatchResponse = { code: 0 };

      const emptyBuffer = Buffer.alloc(0);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(emptyBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/empty.txt",
      });

      // Verify upload was called with checksum (1 for empty buffer: a=1, b=0 => (0<<16)|1 = 1)
      expect(mockClient.drive.v1.media.uploadAll).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            checksum: "1",
            size: 0,
          }),
        }),
        undefined
      );
      expect(result.isError).toBeUndefined();
    });

    it("should calculate correct checksum for non-empty buffer", async () => {
      const testBuffer = Buffer.from("test");
      // adler32 for "test" [116, 101, 115, 116]:
      // a = ((1+116+101+115+116) % 65521) = 449
      // b = ((1+117+218+333+449) % 65521) = 1117
      // checksum = (1117 << 16) | 449 = 73204161

      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "file_token_abc",
      };

      const mockPatchResponse = { code: 0 };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(testBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/test.txt",
      });

      expect(mockClient.drive.v1.media.uploadAll).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            checksum: "73204161",
            size: 4,
          }),
        }),
        undefined
      );
      expect(result.isError).toBeUndefined();
    });
  });

  describe("callback - optional parameters", () => {
    it("should use custom document_revision_id", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "file_token_abc",
      };

      const mockPatchResponse = { code: 0 };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
        document_revision_id: 5,
      });

      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            document_revision_id: 5,
          },
        }),
        undefined
      );
    });

    it("should use default document_revision_id (-1) when not provided", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "file_token_abc",
      };

      const mockPatchResponse = { code: 0 };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
      });

      expect(mockClient.docx.v1.documentBlockChildren.create).toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            document_revision_id: -1,
          },
        }),
        undefined
      );
    });
  });

  describe("callback - content and output format", () => {
    it("should return JSON string in content", async () => {
      const mockCreateResponse = {
        code: 0,
        data: {
          children: [
            {
              block_id: "view_block_123",
              children: ["file_block_456"],
            },
          ],
        },
      };

      const mockUploadResponse = {
        file_token: "file_token_abc",
      };

      const mockPatchResponse = { code: 0 };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer);
      (resolveToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockClient.docx.v1.documentBlockChildren.create.mockResolvedValue(mockCreateResponse);
      mockClient.drive.v1.media.uploadAll.mockResolvedValue(mockUploadResponse);
      mockClient.docx.v1.documentBlock.patch.mockResolvedValue(mockPatchResponse);

      const result = await createFileBlock.callback(mockContext, {
        document_id: "doc123",
        block_id: "block456",
        file_path: "/path/to/file.pdf",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({
        view_block_id: "view_block_123",
        file_block_id: "file_block_456",
        file_token: "file_token_abc",
        file_name: "file.pdf",
      });
    });
  });
});
