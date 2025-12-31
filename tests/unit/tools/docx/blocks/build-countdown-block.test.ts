import { describe, it, expect } from "vitest";
import { buildCountdownBlock } from "../../../../../src/tools/docx/blocks/build-countdown-block.js";

describe("buildCountdownBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildCountdownBlock.name).toBe("build_countdown_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildCountdownBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildCountdownBlock.description).toBeDefined();
      // description is formatted as string by formatDescription
      expect(typeof buildCountdownBlock.description).toBe("string");
      expect(buildCountdownBlock.description).toContain("倒计时");
    });

    it("should have inputSchema", () => {
      expect(buildCountdownBlock.inputSchema).toBeDefined();
    });

    it("should have outputSchema", () => {
      expect(buildCountdownBlock.outputSchema).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};
    const extra = {} as any;

    it("should build a countdown block with default color", async () => {
      const startTime = 1704067200000; // 2024-01-01 00:00:00 UTC
      const duration = 604800000; // 7 days in milliseconds
      const result = await buildCountdownBlock.callback(
        context,
        { startTime, duration } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 40,
        add_ons: {
          component_id: "",
          component_type_id: "blk_6358a421bca0001c1ce10709",
          record: JSON.stringify({
            color: "BLUE",
            duration,
            startTime,
          }),
        },
      });
    });

    it("should build a countdown block with custom color", async () => {
      const startTime = 1704067200000;
      const duration = 86400000; // 1 day
      const result = await buildCountdownBlock.callback(
        context,
        {
          startTime,
          duration,
          color: "RED",
        },
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.color).toBe("RED");
    });

    it("should support all color options", async () => {
      const colors: Array<"BLUE" | "GREEN" | "RED" | "ORANGE" | "PURPLE"> = [
        "BLUE",
        "GREEN",
        "RED",
        "ORANGE",
        "PURPLE",
      ];

      for (const color of colors) {
        const result = await buildCountdownBlock.callback(
          context,
          {
            startTime: 1704067200000,
            duration: 86400000,
            color,
          } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent.add_ons.record);
        expect(record.color).toBe(color);
      }
    });

    it("should return correct block_type (40)", async () => {
      const result = await buildCountdownBlock.callback(
        context,
        {
          startTime: 1704067200000,
          duration: 86400000,
        } as any,
        extra,
      );

      expect(result.structuredContent.block_type).toBe(40);
    });

    it("should have correct component_type_id", async () => {
      const result = await buildCountdownBlock.callback(
        context,
        {
          startTime: 1704067200000,
          duration: 86400000,
        } as any,
        extra,
      );

      expect(result.structuredContent.add_ons.component_type_id).toBe(
        "blk_6358a421bca0001c1ce10709",
      );
    });

    it("should have empty component_id", async () => {
      const result = await buildCountdownBlock.callback(
        context,
        {
          startTime: 1704067200000,
          duration: 86400000,
        } as any,
        extra,
      );

      expect(result.structuredContent.add_ons.component_id).toBe("");
    });

    it("should include correct startTime in record", async () => {
      const startTime = 1735689600000; // 2025-01-01 00:00:00 UTC
      const result = await buildCountdownBlock.callback(
        context,
        {
          startTime,
          duration: 86400000,
        } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.startTime).toBe(startTime);
    });

    it("should include correct duration in record", async () => {
      const duration = 2592000000; // 30 days
      const result = await buildCountdownBlock.callback(
        context,
        {
          startTime: 1704067200000,
          duration,
        } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.duration).toBe(duration);
    });

    it("should return JSON string in content", async () => {
      const startTime = 1704067200000;
      const duration = 86400000;
      const result = await buildCountdownBlock.callback(
        context,
        { startTime, duration } as any,
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
      const startTime = 1704067200000;
      const duration = 86400000;
      const result = await buildCountdownBlock.callback(
        context,
        { startTime, duration } as any,
        extra,
      );

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.block_type).toBe(40);
      expect(result.structuredContent.add_ons).toBeDefined();
    });

    it("should handle very short duration", async () => {
      const startTime = 1704067200000;
      const duration = 1000; // 1 second
      const result = await buildCountdownBlock.callback(
        context,
        { startTime, duration } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.duration).toBe(1000);
    });

    it("should handle very long duration", async () => {
      const startTime = 1704067200000;
      const duration = 31536000000; // 365 days
      const result = await buildCountdownBlock.callback(
        context,
        { startTime, duration } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.duration).toBe(duration);
    });

    it("should handle current timestamp as startTime", async () => {
      const startTime = Date.now();
      const duration = 86400000; // 1 day
      const result = await buildCountdownBlock.callback(
        context,
        { startTime, duration } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.startTime).toBe(startTime);
    });

    it("should calculate correct end time", async () => {
      const startTime = 1704067200000; // 2024-01-01 00:00:00 UTC
      const duration = 604800000; // 7 days
      const expectedEndTime = startTime + duration; // 2024-01-08 00:00:00 UTC

      const result = await buildCountdownBlock.callback(
        context,
        { startTime, duration } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.startTime + record.duration).toBe(expectedEndTime);
    });
  });
});
