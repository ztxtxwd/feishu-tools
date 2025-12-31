import { describe, it, expect } from "vitest";
import { buildGlossaryBlock } from "../../../../../src/tools/docx/blocks/build-glossary-block.js";

describe("buildGlossaryBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildGlossaryBlock.name).toBe("build_glossary_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildGlossaryBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildGlossaryBlock.description).toBeDefined();
      // description is formatted as string by formatDescription
      expect(typeof buildGlossaryBlock.description).toBe("string");
      expect(buildGlossaryBlock.description).toContain("名词解释");
    });

    it("should have inputSchema", () => {
      expect(buildGlossaryBlock.inputSchema).toBeDefined();
    });

    it("should have outputSchema", () => {
      expect(buildGlossaryBlock.outputSchema).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};
    const extra = {} as any;

    it("should build a glossary block with single term", async () => {
      const terms = [{ name: "API", desc: "应用程序编程接口" }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent.block_type).toBe(40);
      expect(result.structuredContent.add_ons.component_id).toBe("");
      expect(result.structuredContent.add_ons.component_type_id).toBe(
        "blk_604dc919d3c0800173e7963c",
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.setting.mode).toBe("glossary");
      expect(record.list).toHaveLength(1);
      expect(record.list[0].name).toBe("API");
      expect(record.list[0].desc).toBe("应用程序编程接口");
      expect(record.list[0].alias).toBe("");
    });

    it("should build a glossary block with multiple terms", async () => {
      const terms = [
        { name: "API", desc: "应用程序编程接口" },
        { name: "SDK", desc: "软件开发工具包" },
        { name: "MCP", desc: "模型上下文协议" },
      ];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.list).toHaveLength(3);
      expect(record.list[0].name).toBe("API");
      expect(record.list[1].name).toBe("SDK");
      expect(record.list[2].name).toBe("MCP");
    });

    it("should handle term with alias", async () => {
      const terms = [{ name: "SDK", desc: "软件开发工具包", alias: "开发包" }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.list[0].alias).toBe("开发包");
    });

    it("should set empty alias when not provided", async () => {
      const terms = [{ name: "API", desc: "应用程序编程接口" }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.list[0].alias).toBe("");
    });

    it("should return correct block_type (40)", async () => {
      const terms = [{ name: "Test", desc: "测试术语" }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      expect(result.structuredContent.block_type).toBe(40);
    });

    it("should have correct component_type_id for glossary", async () => {
      const terms = [{ name: "Test", desc: "测试术语" }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      expect(result.structuredContent.add_ons.component_type_id).toBe(
        "blk_604dc919d3c0800173e7963c",
      );
    });

    it("should have empty component_id", async () => {
      const terms = [{ name: "Test", desc: "测试术语" }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      expect(result.structuredContent.add_ons.component_id).toBe("");
    });

    it("should have correct setting structure", async () => {
      const terms = [{ name: "Test", desc: "测试术语" }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.setting).toEqual({
        columns: [
          {
            dataIndex: "name",
            fixed: "left",
            minWidth: 84,
            name: "name",
            width: 210,
          },
          {
            dataIndex: "desc",
            minWidth: 124,
            name: "desc",
            width: 400,
          },
        ],
        mode: "glossary",
      });
    });

    it("should include empty arrays for docs, images, links in list items", async () => {
      const terms = [{ name: "Test", desc: "测试术语" }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.list[0].docs).toEqual([]);
      expect(record.list[0].images).toEqual([]);
      expect(record.list[0].links).toEqual([]);
    });

    it("should return JSON string in content", async () => {
      const terms = [{ name: "API", desc: "应用程序编程接口" }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
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
      const terms = [{ name: "API", desc: "应用程序编程接口" }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.block_type).toBe(40);
      expect(result.structuredContent.add_ons).toBeDefined();
    });

    it("should handle terms with special characters", async () => {
      const terms = [
        {
          name: "C++",
          desc: '一种通用的、静态类型的编程语言，支持"面向对象"编程',
        },
        {
          name: "JSON",
          desc: "JavaScript Object Notation - 数据交换格式",
          alias: "JS对象表示法",
        },
      ];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.list[0].name).toBe("C++");
      expect(record.list[0].desc).toContain("面向对象");
      expect(record.list[1].alias).toBe("JS对象表示法");
    });

    it("should handle terms with Chinese characters", async () => {
      const terms = [
        { name: "用户界面", desc: "用户与计算机系统交互的界面", alias: "UI" },
        { name: "用户体验", desc: "用户使用产品时的整体感受", alias: "UX" },
      ];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.list[0].name).toBe("用户界面");
      expect(record.list[1].name).toBe("用户体验");
    });

    it("should handle long descriptions", async () => {
      const longDesc =
        "这是一个非常长的描述，用于测试名词解释组件是否能正确处理长文本内容。".repeat(
          10,
        );
      const terms = [{ name: "长文本测试", desc: longDesc }];
      const result = await buildGlossaryBlock.callback(
        context,
        { terms } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.list[0].desc).toBe(longDesc);
    });
  });
});
