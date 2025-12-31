import { describe, it, expect } from "vitest";
import { buildInformationCollectionBlock } from "../../../../../src/tools/docx/blocks/build-information-collection-block.js";

describe("buildInformationCollectionBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildInformationCollectionBlock.name).toBe(
        "build_information_collection_block",
      );
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildInformationCollectionBlock.annotations?.readOnlyHint).toBe(
        true,
      );
    });

    it("should have description", () => {
      expect(buildInformationCollectionBlock.description).toBeDefined();
      expect(typeof buildInformationCollectionBlock.description).toBe("string");
      expect(buildInformationCollectionBlock.description).toContain("信息收集");
    });

    it("should have inputSchema", () => {
      expect(buildInformationCollectionBlock.inputSchema).toBeDefined();
    });

    it("should have outputSchema", () => {
      expect(buildInformationCollectionBlock.outputSchema).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};
    const extra = {} as any;

    it("should build an information collection block with default values", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent.block_type).toBe(40);
      expect(result.structuredContent.add_ons.component_id).toBe("");
      expect(result.structuredContent.add_ons.component_type_id).toBe(
        "blk_6358a421bca0001c1ce11f5f",
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.beforText).toBe("标为已读");
      expect(record.config.afterText).toBe("标为了已读");
      expect(record.config.color).toBe("GREEN");
      expect(record.config.icon).toBe("CHECK");
      expect(record.config.readType).toBe(1);
      expect(record.config.selectVal).toBe(0);
    });

    it("should build an information collection block with custom beforeText and afterText", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        {
          beforeText: "点击确认",
          afterText: "已确认",
        } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.beforText).toBe("点击确认");
      expect(record.config.afterText).toBe("已确认");
    });

    it("should build an information collection block with BLUE color", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        { color: "BLUE" } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.color).toBe("BLUE");
    });

    it("should build an information collection block with RED color", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        { color: "RED" } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.color).toBe("RED");
    });

    it("should build an information collection block with ORANGE color", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        { color: "ORANGE" } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.color).toBe("ORANGE");
    });

    it("should build an information collection block with STAR icon", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        { icon: "STAR" } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.icon).toBe("STAR");
    });

    it("should build an information collection block with HEART icon", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        { icon: "HEART" } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.icon).toBe("HEART");
    });

    it("should build an information collection block with THUMBSUP icon", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        { icon: "THUMBSUP" } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.icon).toBe("THUMBSUP");
    });

    it("should build an information collection block with custom readType", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        { readType: 2 } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.readType).toBe(2);
    });

    it("should build an information collection block with custom selectVal", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        { selectVal: 1 } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.selectVal).toBe(1);
    });

    it("should build an information collection block with all custom values", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        {
          beforeText: "点赞",
          afterText: "已点赞",
          color: "RED",
          icon: "HEART",
          readType: 3,
          selectVal: 5,
        } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.beforText).toBe("点赞");
      expect(record.config.afterText).toBe("已点赞");
      expect(record.config.color).toBe("RED");
      expect(record.config.icon).toBe("HEART");
      expect(record.config.readType).toBe(3);
      expect(record.config.selectVal).toBe(5);
    });

    it("should return correct block_type (40)", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.structuredContent.block_type).toBe(40);
    });

    it("should have correct component_type_id for information collection", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.structuredContent.add_ons.component_type_id).toBe(
        "blk_6358a421bca0001c1ce11f5f",
      );
    });

    it("should have empty component_id", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.structuredContent.add_ons.component_id).toBe("");
    });

    it("should return JSON string in content", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.content).toHaveLength(1);
      const content = result.content[0];
      if (content.type === "text") {
        const parsed = JSON.parse(content.text);
        expect(parsed.block_type).toBe(40);
        expect(parsed.add_ons).toBeDefined();
      }
    });

    it("should return structuredContent", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.block_type).toBe(40);
      expect(result.structuredContent.add_ons).toBeDefined();
    });

    it("should handle Chinese characters in text", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        {
          beforeText: "我已阅读并同意",
          afterText: "已确认阅读",
        } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.beforText).toBe("我已阅读并同意");
      expect(record.config.afterText).toBe("已确认阅读");
    });

    it("should handle special characters in text", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        {
          beforeText: "点击确认 (Click to confirm)",
          afterText: "已确认! ✓",
        } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.config.beforText).toBe("点击确认 (Click to confirm)");
      expect(record.config.afterText).toBe("已确认! ✓");
    });

    it("should preserve beforText typo for API compatibility", async () => {
      const result = await buildInformationCollectionBlock.callback(
        context,
        { beforeText: "测试文本" } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      // Verify the typo "beforText" is used instead of "beforeText"
      expect(record.config).toHaveProperty("beforText");
      expect(record.config).not.toHaveProperty("beforeText");
      expect(record.config.beforText).toBe("测试文本");
    });
  });
});
