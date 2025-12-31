import { describe, it, expect } from "vitest";
import { buildChatCardBlock } from "../../../../../src/tools/docx/blocks/build-chat-card-block.js";

describe("buildChatCardBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildChatCardBlock.name).toBe("build_chat_card_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildChatCardBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildChatCardBlock.description).toBeDefined();
      if (typeof buildChatCardBlock.description === "object") {
        expect(buildChatCardBlock.description.summary).toContain("ChatCard");
      }
    });

    it("should have inputSchema", () => {
      expect(buildChatCardBlock.inputSchema).toBeDefined();
      expect(buildChatCardBlock.inputSchema).toHaveProperty("chat_id");
      expect(buildChatCardBlock.inputSchema).toHaveProperty("align");
    });

    it("should have outputSchema", () => {
      expect(buildChatCardBlock.outputSchema).toBeDefined();
      expect(buildChatCardBlock.outputSchema).toHaveProperty("block_type");
      expect(buildChatCardBlock.outputSchema).toHaveProperty("chat_card");
    });
  });

  describe("callback with required parameters only", () => {
    const context = {};

    it("should build a chat card block with chat_id only", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_abc123",
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 20,
        chat_card: {
          chat_id: "oc_abc123",
        },
      });
    });

    it("should return correct block_type (20)", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_test",
      });

      expect(result.structuredContent.block_type).toBe(20);
    });

    it("should not include align when not specified", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_test",
      });

      expect(result.structuredContent.chat_card).not.toHaveProperty("align");
    });

    it("should return JSON string in content", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_xyz789",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(20);
      expect(parsed.chat_card.chat_id).toBe("oc_xyz789");
    });
  });

  describe("callback with align parameter", () => {
    const context = {};

    it("should build a chat card block with align=1 (left)", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_left",
        align: 1,
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 20,
        chat_card: {
          chat_id: "oc_left",
          align: 1,
        },
      });
    });

    it("should build a chat card block with align=2 (center)", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_center",
        align: 2,
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 20,
        chat_card: {
          chat_id: "oc_center",
          align: 2,
        },
      });
    });

    it("should build a chat card block with align=3 (right)", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_right",
        align: 3,
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 20,
        chat_card: {
          chat_id: "oc_right",
          align: 3,
        },
      });
    });

    it("should include align in JSON content when specified", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_test",
        align: 2,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.chat_card.align).toBe(2);
    });
  });

  describe("structuredContent", () => {
    const context = {};

    it("should return structuredContent with chat_id only", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_structured",
      });

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent).toEqual({
        block_type: 20,
        chat_card: {
          chat_id: "oc_structured",
        },
      });
    });

    it("should return structuredContent with all parameters", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_full",
        align: 3,
      });

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent).toEqual({
        block_type: 20,
        chat_card: {
          chat_id: "oc_full",
          align: 3,
        },
      });
    });
  });

  describe("various chat_id formats", () => {
    const context = {};

    it("should handle typical oc_ prefixed chat_id", async () => {
      const result = await buildChatCardBlock.callback(context, {
        chat_id: "oc_1234567890abcdef",
      });

      expect(result.structuredContent.chat_card.chat_id).toBe(
        "oc_1234567890abcdef"
      );
    });

    it("should handle long chat_id", async () => {
      const longChatId = "oc_" + "a".repeat(100);
      const result = await buildChatCardBlock.callback(context, {
        chat_id: longChatId,
      });

      expect(result.structuredContent.chat_card.chat_id).toBe(longChatId);
    });
  });
});
