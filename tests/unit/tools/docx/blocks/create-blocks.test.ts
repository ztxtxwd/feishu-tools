import { describe, it, expect, vi } from "vitest";
import { createBlocks } from "../../../../../src/tools/docx/blocks/create-blocks.js";
import { objectFromShape, safeParse } from "@modelcontextprotocol/sdk/server/zod-compat.js";

describe("create_blocks", () => {
  describe("Tool Definition", () => {
    it("should have correct name", () => {
      expect(createBlocks.name).toBe("create_blocks");
    });

    it("should have formatted description string", () => {
      expect(typeof createBlocks.description).toBe("string");
      expect(createBlocks.description).toContain("在飞书文档中创建块");
      expect(createBlocks.description).toContain("适用于");
      expect(createBlocks.description).toContain("不适用于");
      expect(createBlocks.description).toContain("使用指南");
    });

    it("should have annotations", () => {
      expect(createBlocks.annotations).toHaveProperty("title");
      expect(createBlocks.annotations?.title).toBe("创建块");
    });

    it("should have callback function", () => {
      expect(createBlocks.callback).toBeTypeOf("function");
    });

    it("should have inputSchema as an object with field schemas", () => {
      expect(typeof createBlocks.inputSchema).toBe("object");
      expect(createBlocks.inputSchema).toHaveProperty("document_id");
      expect(createBlocks.inputSchema).toHaveProperty("children_id");
      expect(createBlocks.inputSchema).toHaveProperty("descendants");
    });
  });

  describe("Input Schema Validation", () => {
    const schema = objectFromShape(createBlocks.inputSchema);

    it("should validate required fields", () => {
      const validInput = {
        document_id: "doc123",
        children_id: ["block1"],
        descendants: [
          {
            block_id: "block1",
            block_type: 2,
            text: { style: {}, elements: [{ text_run: { content: "Hello" } }] },
          },
        ],
      };

      const result = safeParse(schema, validInput);
      expect(result.success).toBe(true);
    });

    it("should reject missing document_id", () => {
      const invalidInput = {
        children_id: ["block1"],
        descendants: [],
      };

      const result = safeParse(schema, invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject missing children_id", () => {
      const invalidInput = {
        document_id: "doc123",
        descendants: [],
      };

      const result = safeParse(schema, invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject empty children_id array", () => {
      const invalidInput = {
        document_id: "doc123",
        children_id: [],
        descendants: [],
      };

      const result = safeParse(schema, invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject children_id array with more than 1000 items", () => {
      const invalidInput = {
        document_id: "doc123",
        children_id: Array(1001).fill("block"),
        descendants: [],
      };

      const result = safeParse(schema, invalidInput);
      expect(result.success).toBe(false);
    });

    it("should accept children_id array with exactly 1000 items", () => {
      const validInput = {
        document_id: "doc123",
        children_id: Array(1000).fill("block"),
        descendants: [],
      };

      const result = safeParse(schema, validInput);
      expect(result.success).toBe(true);
    });

    it("should accept optional block_id", () => {
      const validInput = {
        document_id: "doc123",
        block_id: "parent123",
        children_id: ["block1"],
        descendants: [],
      };

      const result = safeParse(schema, validInput);
      expect(result.success).toBe(true);
    });

    it("should accept optional index", () => {
      const validInput = {
        document_id: "doc123",
        index: 5,
        children_id: ["block1"],
        descendants: [],
      };

      const result = safeParse(schema, validInput);
      expect(result.success).toBe(true);
    });

    it("should reject non-integer index", () => {
      const invalidInput = {
        document_id: "doc123",
        index: 5.5,
        children_id: ["block1"],
        descendants: [],
      };

      const result = safeParse(schema, invalidInput);
      expect(result.success).toBe(false);
    });

    it("should accept optional document_revision_id", () => {
      const validInput = {
        document_id: "doc123",
        document_revision_id: 42,
        children_id: ["block1"],
        descendants: [],
      };

      const result = safeParse(schema, validInput);
      expect(result.success).toBe(true);
    });

    it("should accept optional client_token", () => {
      const validInput = {
        document_id: "doc123",
        client_token: "token123",
        children_id: ["block1"],
        descendants: [],
      };

      const result = safeParse(schema, validInput);
      expect(result.success).toBe(true);
    });
  });

  describe("Callback Execution", () => {
    const mockExtra = {} as any;

    it("should return error when client is missing", async () => {
      const context = {};
      const args = {
        document_id: "doc123",
        children_id: ["block1"],
        descendants: [],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      if (result.content[0].type === "text") {
        expect(result.content[0].text).toContain("Feishu client is required");
      }
    });

    it("should create single block successfully", async () => {
      const mockClient = {
        docx: {
          v1: {
            documentBlockDescendant: {
              create: vi.fn().mockResolvedValue({
                code: 0,
                msg: "success",
                data: {
                  descendants: [
                    {
                      block_id: "new_block_id",
                      block_type: 2,
                    },
                  ],
                },
              }),
            },
          },
        },
      };

      const context = { client: mockClient };
      const args = {
        document_id: "doc123",
        children_id: ["block1"],
        descendants: [
          {
            block_id: "block1",
            block_type: 2,
            text: { style: {}, elements: [{ text_run: { content: "Hello" } }] },
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(mockClient.docx.v1.documentBlockDescendant.create).toHaveBeenCalledWith({
        path: {
          document_id: "doc123",
          block_id: "doc123",
        },
        params: {
          document_revision_id: undefined,
          client_token: undefined,
        },
        data: {
          children_id: ["block1"],
          index: undefined,
          descendants: args.descendants,
        },
      });
    });

    it("should create nested blocks successfully", async () => {
      const mockClient = {
        docx: {
          v1: {
            documentBlockDescendant: {
              create: vi.fn().mockResolvedValue({
                code: 0,
                msg: "success",
                data: {
                  descendants: [
                    { block_id: "grid1", block_type: 25 },
                    { block_id: "col1", block_type: 26 },
                    { block_id: "col2", block_type: 26 },
                  ],
                },
              }),
            },
          },
        },
      };

      const context = { client: mockClient };
      const args = {
        document_id: "doc123",
        children_id: ["grid1"],
        descendants: [
          {
            block_id: "grid1",
            block_type: 25,
            grid: { column_size: 2 },
            children: ["col1", "col2"],
          },
          {
            block_id: "col1",
            block_type: 26,
            grid_column: { width_ratio: 1 },
          },
          {
            block_id: "col2",
            block_type: 26,
            grid_column: { width_ratio: 1 },
          },
        ],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(mockClient.docx.v1.documentBlockDescendant.create).toHaveBeenCalledTimes(1);
    });

    it("should use specified block_id as parent", async () => {
      const mockClient = {
        docx: {
          v1: {
            documentBlockDescendant: {
              create: vi.fn().mockResolvedValue({
                code: 0,
                msg: "success",
                data: { descendants: [] },
              }),
            },
          },
        },
      };

      const context = { client: mockClient };
      const args = {
        document_id: "doc123",
        block_id: "parent456",
        children_id: ["block1"],
        descendants: [],
      };

      await createBlocks.callback(context, args, mockExtra);

      expect(mockClient.docx.v1.documentBlockDescendant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.objectContaining({
            document_id: "doc123",
            block_id: "parent456",
          }),
        })
      );
    });

    it("should use document_id as default block_id when not specified", async () => {
      const mockClient = {
        docx: {
          v1: {
            documentBlockDescendant: {
              create: vi.fn().mockResolvedValue({
                code: 0,
                msg: "success",
                data: { descendants: [] },
              }),
            },
          },
        },
      };

      const context = { client: mockClient };
      const args = {
        document_id: "doc123",
        children_id: ["block1"],
        descendants: [],
      };

      await createBlocks.callback(context, args, mockExtra);

      expect(mockClient.docx.v1.documentBlockDescendant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.objectContaining({
            document_id: "doc123",
            block_id: "doc123",
          }),
        })
      );
    });

    it("should pass optional parameters correctly", async () => {
      const mockClient = {
        docx: {
          v1: {
            documentBlockDescendant: {
              create: vi.fn().mockResolvedValue({
                code: 0,
                msg: "success",
                data: { descendants: [] },
              }),
            },
          },
        },
      };

      const context = { client: mockClient };
      const args = {
        document_id: "doc123",
        block_id: "parent456",
        index: 3,
        children_id: ["block1"],
        descendants: [],
        document_revision_id: 42,
        client_token: "token_xyz",
      };

      await createBlocks.callback(context, args, mockExtra);

      expect(mockClient.docx.v1.documentBlockDescendant.create).toHaveBeenCalledWith({
        path: {
          document_id: "doc123",
          block_id: "parent456",
        },
        params: {
          document_revision_id: 42,
          client_token: "token_xyz",
        },
        data: {
          children_id: ["block1"],
          index: 3,
          descendants: [],
        },
      });
    });

    it("should handle API error response with non-zero code", async () => {
      const mockClient = {
        docx: {
          v1: {
            documentBlockDescendant: {
              create: vi.fn().mockResolvedValue({
                code: 400,
                msg: "Invalid parameter",
                data: null,
              }),
            },
          },
        },
      };

      const context = { client: mockClient };
      const args = {
        document_id: "doc123",
        children_id: ["block1"],
        descendants: [],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      if (result.content[0].type === "text") {
        expect(result.content[0].text).toContain("Failed to create blocks");
        expect(result.content[0].text).toContain("Code: 400");
        expect(result.content[0].text).toContain("Invalid parameter");
      }
    });

    it("should handle API throwing an Error", async () => {
      const mockClient = {
        docx: {
          v1: {
            documentBlockDescendant: {
              create: vi.fn().mockRejectedValue(new Error("Network error")),
            },
          },
        },
      };

      const context = { client: mockClient };
      const args = {
        document_id: "doc123",
        children_id: ["block1"],
        descendants: [],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      if (result.content[0].type === "text") {
        expect(result.content[0].text).toContain("Error: Network error");
      }
    });

    it("should handle API throwing a non-Error value", async () => {
      const mockClient = {
        docx: {
          v1: {
            documentBlockDescendant: {
              create: vi.fn().mockRejectedValue("Something went wrong"),
            },
          },
        },
      };

      const context = { client: mockClient };
      const args = {
        document_id: "doc123",
        children_id: ["block1"],
        descendants: [],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      if (result.content[0].type === "text") {
        expect(result.content[0].text).toContain("Error: Something went wrong");
      }
    });

    it("should return properly formatted JSON result on success", async () => {
      const mockResponseData = {
        descendants: [
          {
            block_id: "new_block_123",
            block_type: 2,
            text: {
              elements: [{ text_run: { content: "Created text" } }],
            },
          },
        ],
        document_revision_id: 43,
      };

      const mockClient = {
        docx: {
          v1: {
            documentBlockDescendant: {
              create: vi.fn().mockResolvedValue({
                code: 0,
                msg: "success",
                data: mockResponseData,
              }),
            },
          },
        },
      };

      const context = { client: mockClient };
      const args = {
        document_id: "doc123",
        children_id: ["block1"],
        descendants: [],
      };

      const result = await createBlocks.callback(context, args, mockExtra);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      if (result.content[0].type === "text") {
        const parsedData = JSON.parse(result.content[0].text);
        expect(parsedData).toEqual(mockResponseData);
      }
    });
  });
});
