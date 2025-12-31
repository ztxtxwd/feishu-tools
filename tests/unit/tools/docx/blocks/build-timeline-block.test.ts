import { describe, it, expect } from "vitest";
import { buildTimelineBlock } from "../../../../../src/tools/docx/blocks/build-timeline-block.js";

describe("buildTimelineBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildTimelineBlock.name).toBe("build_timeline_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildTimelineBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildTimelineBlock.description).toBeDefined();
      // description is formatted as string by formatDescription
      expect(typeof buildTimelineBlock.description).toBe("string");
      expect(buildTimelineBlock.description).toContain("时间轴");
    });

    it("should have inputSchema", () => {
      expect(buildTimelineBlock.inputSchema).toBeDefined();
    });

    it("should have outputSchema", () => {
      expect(buildTimelineBlock.outputSchema).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};
    const extra = {} as any;

    it("should build a timeline block with single item", async () => {
      const items = [{ title: "项目启动", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent.block_type).toBe(40);
      expect(result.structuredContent.add_ons.component_id).toBe("");
      expect(result.structuredContent.add_ons.component_type_id).toBe(
        "blk_6358a421bca0001c22536e4c",
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.mode).toBe("horizontal_alternating");
      expect(record.items).toHaveLength(1);
      expect(record.items[0].title).toBe("项目启动");
      expect(record.items[0].time).toBe("2024-01-01");
      expect(record.items[0].text).toBe("");
    });

    it("should build a timeline block with multiple items", async () => {
      const items = [
        { title: "项目启动", time: "2024-01-01", text: "项目正式启动" },
        { title: "第一阶段", time: "2024-03-01", text: "完成基础功能" },
        { title: "正式上线", time: "2024-06-01", text: "产品发布" },
      ];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.items).toHaveLength(3);
      expect(record.items[0].title).toBe("项目启动");
      expect(record.items[1].title).toBe("第一阶段");
      expect(record.items[2].title).toBe("正式上线");
    });

    it("should handle item with text", async () => {
      const items = [
        { title: "里程碑", time: "2024-05-01", text: "重要的里程碑描述" },
      ];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.items[0].text).toBe("重要的里程碑描述");
    });

    it("should set empty text when not provided", async () => {
      const items = [{ title: "事件", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.items[0].text).toBe("");
    });

    it("should use horizontal_alternating mode by default", async () => {
      const items = [{ title: "Test", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.mode).toBe("horizontal_alternating");
    });

    it("should support horizontal mode", async () => {
      const items = [{ title: "Test", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items, mode: "horizontal" } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.mode).toBe("horizontal");
    });

    it("should support vertical mode", async () => {
      const items = [{ title: "Test", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items, mode: "vertical" } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.mode).toBe("vertical");
    });

    it("should have default contentShow values", async () => {
      const items = [{ title: "Test", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.contentShow).toEqual({
        title: true,
        time: true,
        text: true,
      });
    });

    it("should support custom contentShow configuration", async () => {
      const items = [{ title: "Test", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        {
          items,
          contentShow: { title: true, time: false, text: false },
        } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.contentShow).toEqual({
        title: true,
        time: false,
        text: false,
      });
    });

    it("should merge partial contentShow with defaults", async () => {
      const items = [{ title: "Test", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        {
          items,
          contentShow: { text: false },
        } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.contentShow).toEqual({
        title: true,
        time: true,
        text: false,
      });
    });

    it("should return correct block_type (40)", async () => {
      const items = [{ title: "Test", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.structuredContent.block_type).toBe(40);
    });

    it("should have correct component_type_id for timeline", async () => {
      const items = [{ title: "Test", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.structuredContent.add_ons.component_type_id).toBe(
        "blk_6358a421bca0001c22536e4c",
      );
    });

    it("should have empty component_id", async () => {
      const items = [{ title: "Test", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.structuredContent.add_ons.component_id).toBe("");
    });

    it("should generate unique blockId", async () => {
      const items = [{ title: "Test", time: "2024-01-01" }];
      const result1 = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );
      const result2 = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      const record1 = JSON.parse(result1.structuredContent.add_ons.record);
      const record2 = JSON.parse(result2.structuredContent.add_ons.record);
      expect(record1.blockId).not.toBe(record2.blockId);
    });

    it("should generate unique id for each item", async () => {
      const items = [
        { title: "Event 1", time: "2024-01-01" },
        { title: "Event 2", time: "2024-02-01" },
      ];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.items[0].id).toBeDefined();
      expect(record.items[1].id).toBeDefined();
      expect(record.items[0].id).not.toBe(record.items[1].id);
    });

    it("should return JSON string in content", async () => {
      const items = [{ title: "项目启动", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
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
      const items = [{ title: "项目启动", time: "2024-01-01" }];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.block_type).toBe(40);
      expect(result.structuredContent.add_ons).toBeDefined();
    });

    it("should handle items with special characters", async () => {
      const items = [
        {
          title: "版本 v1.0.0-beta",
          time: "2024-01-01 10:30:00",
          text: '发布"测试版"，包含<新功能>',
        },
      ];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.items[0].title).toBe("版本 v1.0.0-beta");
      expect(record.items[0].time).toBe("2024-01-01 10:30:00");
      expect(record.items[0].text).toContain("测试版");
    });

    it("should handle items with Chinese characters", async () => {
      const items = [
        { title: "第一季度", time: "2024年1月", text: "完成用户调研" },
        { title: "第二季度", time: "2024年4月", text: "产品设计定稿" },
      ];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.items[0].title).toBe("第一季度");
      expect(record.items[0].time).toBe("2024年1月");
      expect(record.items[1].title).toBe("第二季度");
    });

    it("should handle long text descriptions", async () => {
      const longText =
        "这是一个非常长的描述文本，用于测试时间轴组件是否能正确处理长文本内容。".repeat(
          10,
        );
      const items = [{ title: "长文本测试", time: "2024-01-01", text: longText }];
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.items[0].text).toBe(longText);
    });

    it("should handle many items", async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        title: `Event ${i + 1}`,
        time: `2024-${String(i % 12 + 1).padStart(2, "0")}-01`,
        text: `Description for event ${i + 1}`,
      }));
      const result = await buildTimelineBlock.callback(
        context,
        { items } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.items).toHaveLength(20);
    });
  });
});
