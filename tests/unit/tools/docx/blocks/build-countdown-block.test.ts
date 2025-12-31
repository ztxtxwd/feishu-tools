import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

    // 固定时间以便测试（使用本地时间）
    const mockNow = new Date(2025, 0, 1, 10, 0, 0, 0); // 2025-01-01 10:00:00 本地时间
    const mockTimestamp = mockNow.getTime();

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe("目标日期时间模式 (timingType: 1)", () => {
      it("should build countdown block with targetDateTime", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { targetDateTime: "2025-01-08 10:00" } as any,
          extra,
        );

        expect(result.isError).toBeUndefined();
        expect(result.structuredContent!.block_type).toBe(40);

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.timingType).toBe(1);
        expect(record.settingData).toEqual({
          date: "2025-01-08",
          time: "10:00",
        });
        expect(record.duration).toBe(7 * 24 * 60 * 60); // 7 days in seconds
        expect(record.startTime).toBe(mockTimestamp);
      });

      it("should return error for invalid targetDateTime format", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { targetDateTime: "2025-01-08" } as any, // 缺少时间部分
          extra,
        );

        expect(result.isError).toBe(true);
        expect(result.content[0]).toMatchObject({
          type: "text",
          text: expect.stringContaining("格式错误"),
        });
      });

      it("should return error for invalid date", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { targetDateTime: "invalid-date 10:00" } as any,
          extra,
        );

        expect(result.isError).toBe(true);
        expect(result.content[0]).toMatchObject({
          type: "text",
          text: expect.stringContaining("解析失败"),
        });
      });

      it("should handle past targetDateTime (duration = 0)", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { targetDateTime: "2024-01-01 00:00" } as any, // 过去的时间
          extra,
        );

        expect(result.isError).toBeUndefined();
        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.duration).toBe(0);
      });
    });

    describe("持续时间模式 (timingType: 0)", () => {
      it("should build countdown block with days", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 7 } as any,
          extra,
        );

        expect(result.isError).toBeUndefined();
        expect(result.structuredContent!.block_type).toBe(40);

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.timingType).toBe(0);
        expect(record.duration).toBe(7 * 24 * 60 * 60); // 7 days in seconds
        expect(record.settingData.d).toBe("7");
        expect(record.settingData.h).toBe("0");
        expect(record.settingData.m).toBe("0");
        expect(record.settingData.s).toBe("0");
      });

      it("should build countdown block with hours, minutes, seconds", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { hours: 2, minutes: 30, seconds: 45 } as any,
          extra,
        );

        expect(result.isError).toBeUndefined();
        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.timingType).toBe(0);
        expect(record.duration).toBe(2 * 3600 + 30 * 60 + 45);
        expect(record.settingData.d).toBe("0");
        expect(record.settingData.h).toBe("2");
        expect(record.settingData.m).toBe("30");
        expect(record.settingData.s).toBe("45");
      });

      it("should build countdown block with all time components", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, hours: 2, minutes: 30, seconds: 45 } as any,
          extra,
        );

        expect(result.isError).toBeUndefined();
        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.duration).toBe(1 * 86400 + 2 * 3600 + 30 * 60 + 45);
      });

      it("should return error when no duration specified", async () => {
        const result = await buildCountdownBlock.callback(context, {} as any, extra);

        expect(result.isError).toBe(true);
        expect(result.content[0]).toMatchObject({
          type: "text",
          text: expect.stringContaining("请指定"),
        });
      });

      it("should return error when all durations are 0", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 0, hours: 0, minutes: 0, seconds: 0 } as any,
          extra,
        );

        expect(result.isError).toBe(true);
      });

      it("should include current date/time in settingData", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1 } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.settingData.date).toBe("2025-01-01");
        expect(record.settingData.time).toBe("10:00");
      });
    });

    describe("颜色配置", () => {
      it("should use default color (ORANGE) when not specified", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1 } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.color).toBe("#FF8800");
      });

      it("should support color name BLUE", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, color: "BLUE" } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.color).toBe("#3370FF");
      });

      it("should support color name GREEN", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, color: "GREEN" } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.color).toBe("#34C724");
      });

      it("should support color name RED", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, color: "RED" } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.color).toBe("#F54A45");
      });

      it("should support color name PURPLE", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, color: "PURPLE" } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.color).toBe("#7B67EE");
      });

      it("should support lowercase color names", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, color: "blue" } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.color).toBe("#3370FF");
      });

      it("should support hex color directly", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, color: "#123456" } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.color).toBe("#123456");
      });

      it("should normalize hex color to uppercase", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, color: "#abcdef" } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.color).toBe("#ABCDEF");
      });

      it("should fallback to ORANGE for unknown color name", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, color: "UNKNOWN" } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.color).toBe("#FF8800");
      });
    });

    describe("通知配置", () => {
      it("should default notify to true", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1 } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.isNotify).toBe(true);
      });

      it("should support notify: false", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, notify: false } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.isNotify).toBe(false);
      });

      it("should support notify: true explicitly", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1, notify: true } as any,
          extra,
        );

        const record = JSON.parse(result.structuredContent!.add_ons.record);
        expect(record.isNotify).toBe(true);
      });
    });

    describe("输出格式", () => {
      it("should return correct block_type (40)", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1 } as any,
          extra,
        );

        expect(result.structuredContent!.block_type).toBe(40);
      });

      it("should have correct component_type_id", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1 } as any,
          extra,
        );

        expect(result.structuredContent!.add_ons.component_type_id).toBe(
          "blk_6358a421bca0001c1ce10709",
        );
      });

      it("should have empty component_id", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1 } as any,
          extra,
        );

        expect(result.structuredContent!.add_ons.component_id).toBe("");
      });

      it("should return JSON string in content", async () => {
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1 } as any,
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
        const result = await buildCountdownBlock.callback(
          context,
          { days: 1 } as any,
          extra,
        );

        expect(result.structuredContent).toBeDefined();
        expect(result.structuredContent!.block_type).toBe(40);
        expect(result.structuredContent!.add_ons).toBeDefined();
      });
    });
  });
});
