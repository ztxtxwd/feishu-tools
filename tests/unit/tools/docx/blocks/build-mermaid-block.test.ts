import { describe, it, expect } from "vitest";
import { buildMermaidBlock } from "../../../../../src/tools/docx/blocks/build-mermaid-block.js";

describe("buildMermaidBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildMermaidBlock.name).toBe("build_mermaid_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildMermaidBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildMermaidBlock.description).toBeDefined();
      // description is formatted as string by formatDescription
      expect(typeof buildMermaidBlock.description).toBe("string");
      expect(buildMermaidBlock.description).toContain("Mermaid");
    });

    it("should have inputSchema", () => {
      expect(buildMermaidBlock.inputSchema).toBeDefined();
    });

    it("should have outputSchema", () => {
      expect(buildMermaidBlock.outputSchema).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};

    it("should build a mermaid block with default theme", async () => {
      const code = "graph TD\n  A[Start] --> B[End]";
      const result = await buildMermaidBlock.callback(context, { code });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 40,
        add_ons: {
          component_id: "",
          component_type_id: "blk_631fefbbae02400430b8f9f4",
          record: JSON.stringify({
            data: code,
            theme: "default",
            view: "codeChart",
          }),
        },
      });
    });

    it("should build a mermaid block with custom theme", async () => {
      const code = "graph LR\n  A --> B";
      const result = await buildMermaidBlock.callback(context, {
        code,
        theme: "dark",
      });

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.theme).toBe("dark");
    });

    it("should support all theme options", async () => {
      const themes: Array<"default" | "dark" | "forest" | "neutral"> = [
        "default",
        "dark",
        "forest",
        "neutral",
      ];

      for (const theme of themes) {
        const result = await buildMermaidBlock.callback(context, {
          code: "graph TD\n  A --> B",
          theme,
        });

        const record = JSON.parse(result.structuredContent.add_ons.record);
        expect(record.theme).toBe(theme);
      }
    });

    it("should return correct block_type (40)", async () => {
      const result = await buildMermaidBlock.callback(context, {
        code: "graph TD\n  A --> B",
      });

      expect(result.structuredContent.block_type).toBe(40);
    });

    it("should have correct component_type_id", async () => {
      const result = await buildMermaidBlock.callback(context, {
        code: "graph TD\n  A --> B",
      });

      expect(result.structuredContent.add_ons.component_type_id).toBe(
        "blk_631fefbbae02400430b8f9f4"
      );
    });

    it("should have empty component_id", async () => {
      const result = await buildMermaidBlock.callback(context, {
        code: "graph TD\n  A --> B",
      });

      expect(result.structuredContent.add_ons.component_id).toBe("");
    });

    it("should include view as codeChart in record", async () => {
      const result = await buildMermaidBlock.callback(context, {
        code: "graph TD\n  A --> B",
      });

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.view).toBe("codeChart");
    });

    it("should return JSON string in content", async () => {
      const code = "graph TD\n  A --> B";
      const result = await buildMermaidBlock.callback(context, { code });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(40);
      expect(parsed.add_ons).toBeDefined();
    });

    it("should return structuredContent", async () => {
      const code = "sequenceDiagram\n  A->>B: Hello";
      const result = await buildMermaidBlock.callback(context, { code });

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.block_type).toBe(40);
      expect(result.structuredContent.add_ons).toBeDefined();
    });

    it("should handle complex mermaid code", async () => {
      const complexCode = `
        sequenceDiagram
          participant Alice
          participant Bob
          Alice->>Bob: Hello Bob, how are you?
          Bob-->>Alice: I am good, thanks!
          loop Every minute
            Bob->>Alice: Checking...
          end
      `;

      const result = await buildMermaidBlock.callback(context, {
        code: complexCode,
      });

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.data).toBe(complexCode);
    });

    it("should handle mermaid code with special characters", async () => {
      const specialCode = `graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]`;

      const result = await buildMermaidBlock.callback(context, {
        code: specialCode,
        theme: "forest",
      });

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.data).toBe(specialCode);
      expect(record.theme).toBe("forest");
    });
  });
});
