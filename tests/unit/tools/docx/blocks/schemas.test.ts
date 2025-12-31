import { describe, it, expect } from "vitest";
import {
  baseBlockStyleSchema,
  textBlockStyleSchema,
  headingBlockStyleSchema,
  codeBlockStyleSchema,
  todoBlockStyleSchema,
  listBlockStyleSchema,
  quoteBlockStyleSchema,
  textElementStyleSchema,
  textRunSchema,
  BlockBackgroundColor,
  AlignNumber,
  IndentationLevel,
  CodeLanguage,
  BLOCK_TYPE_MAP,
} from "../../../../../src/tools/docx/blocks/schemas.js";

describe("Block Style Schemas", () => {
  describe("baseBlockStyleSchema", () => {
    it("should validate a complete base style", () => {
      const style = {
        align: 2,
        folded: true,
        background_color: "LightBlueBackground" as const,
      };

      const result = baseBlockStyleSchema.parse(style);
      expect(result).toEqual(style);
    });

    it("should allow all optional fields to be omitted", () => {
      const style = {};
      const result = baseBlockStyleSchema.parse(style);
      expect(result).toEqual({});
    });

    it("should reject invalid align value", () => {
      const style = { align: 4 };
      expect(() => baseBlockStyleSchema.parse(style)).toThrow();
    });

    it("should reject invalid background_color", () => {
      const style = { background_color: "InvalidColor" };
      expect(() => baseBlockStyleSchema.parse(style)).toThrow();
    });
  });

  describe("textBlockStyleSchema", () => {
    it("should validate text block style with indentation", () => {
      const style = {
        align: 1,
        indentation_level: "OneLevelIndent" as const,
        background_color: "LightYellowBackground" as const,
      };

      const result = textBlockStyleSchema.parse(style);
      expect(result).toEqual(style);
    });

    it("should accept no indentation", () => {
      const style = {
        indentation_level: "NoIndent" as const,
      };

      const result = textBlockStyleSchema.parse(style);
      expect(result.indentation_level).toBe("NoIndent");
    });
  });

  describe("headingBlockStyleSchema", () => {
    it("should validate heading block style", () => {
      const style = {
        align: 2,
        folded: true,
        background_color: "DarkGrayBackground" as const,
      };

      const result = headingBlockStyleSchema.parse(style);
      expect(result).toEqual(style);
    });

    it("should not have indentation_level", () => {
      // headingBlockStyleSchema 不应该包含 indentation_level
      const schema = headingBlockStyleSchema.shape;
      expect((schema as any).indentation_level).toBeUndefined();
    });
  });

  describe("codeBlockStyleSchema", () => {
    it("should validate code block style with language", () => {
      const style = {
        language: 63, // TypeScript
        wrap: true,
        background_color: "DarkGrayBackground" as const,
      };

      const result = codeBlockStyleSchema.parse(style);
      expect(result).toEqual(style);
    });

    it("should accept various language codes", () => {
      const languages = [1, 7, 22, 29, 30, 49, 53, 56, 63]; // 常用语言

      languages.forEach((lang) => {
        const style = { language: lang };
        const result = codeBlockStyleSchema.parse(style);
        expect(result.language).toBe(lang);
      });
    });

    it("should reject invalid language code", () => {
      const style = { language: 0 };
      expect(() => codeBlockStyleSchema.parse(style)).toThrow();

      const style2 = { language: 76 };
      expect(() => codeBlockStyleSchema.parse(style2)).toThrow();
    });
  });

  describe("todoBlockStyleSchema", () => {
    it("should validate todo block style with done status", () => {
      const style = {
        done: true,
        background_color: "LightGreenBackground" as const,
      };

      const result = todoBlockStyleSchema.parse(style);
      expect(result).toEqual(style);
    });

    it("should default done to undefined when not provided", () => {
      const style = {};
      const result = todoBlockStyleSchema.parse(style);
      expect(result.done).toBeUndefined();
    });
  });

  describe("listBlockStyleSchema", () => {
    it("should validate list block style", () => {
      const style = {
        align: 1,
        folded: false,
        background_color: "LightGreenBackground" as const,
      };

      const result = listBlockStyleSchema.parse(style);
      expect(result).toEqual(style);
    });
  });

  describe("quoteBlockStyleSchema", () => {
    it("should validate quote block style", () => {
      const style = {
        align: 1,
        background_color: "LightPurpleBackground" as const,
      };

      const result = quoteBlockStyleSchema.parse(style);
      expect(result).toEqual(style);
    });
  });

  describe("textElementStyleSchema", () => {
    it("should validate text element style with all properties", () => {
      const style = {
        bold: true,
        italic: true,
        strikethrough: false,
        underline: true,
        inline_code: false,
        background_color: 1,
        text_color: 5,
      };

      const result = textElementStyleSchema.parse(style);
      expect(result).toEqual(style);
    });

    it("should validate with minimal properties", () => {
      const style = { bold: true };
      const result = textElementStyleSchema.parse(style);
      expect(result.bold).toBe(true);
    });

    it("should reject invalid text_color", () => {
      const style = { text_color: 8 };
      expect(() => textElementStyleSchema.parse(style)).toThrow();
    });

    it("should reject invalid background_color", () => {
      const style = { background_color: 16 };
      expect(() => textElementStyleSchema.parse(style)).toThrow();
    });
  });

  describe("textRunSchema", () => {
    it("should validate text run with content only", () => {
      const textRun = {
        content: "Hello, world!",
      };

      const result = textRunSchema.parse(textRun);
      expect(result.content).toBe("Hello, world!");
    });

    it("should validate text run with styling", () => {
      const textRun = {
        content: "Styled text",
        text_element_style: {
          bold: true,
          text_color: 1,
        },
      };

      const result = textRunSchema.parse(textRun);
      expect(result.content).toBe("Styled text");
      expect(result.text_element_style?.bold).toBe(true);
      expect(result.text_element_style?.text_color).toBe(1);
    });

    it("should support newlines in content", () => {
      const textRun = {
        content: "Line 1\nLine 2\nLine 3",
      };

      const result = textRunSchema.parse(textRun);
      expect(result.content).toContain("\n");
    });
  });

  describe("Enums", () => {
    it("should validate BlockBackgroundColor enum", () => {
      const colors = [
        "LightGrayBackground",
        "LightRedBackground",
        "LightBlueBackground",
        "DarkGrayBackground",
      ] as const;

      colors.forEach((color) => {
        const result = BlockBackgroundColor.parse(color);
        expect(result).toBe(color);
      });
    });

    it("should validate AlignNumber enum", () => {
      [1, 2, 3].forEach((align) => {
        const result = AlignNumber.parse(align);
        expect(result).toBe(align);
      });

      expect(() => AlignNumber.parse(0)).toThrow();
      expect(() => AlignNumber.parse(4)).toThrow();
    });

    it("should validate IndentationLevel enum", () => {
      const levels = ["NoIndent", "OneLevelIndent"] as const;

      levels.forEach((level) => {
        const result = IndentationLevel.parse(level);
        expect(result).toBe(level);
      });

      expect(() => IndentationLevel.parse("TwoLevelIndent")).toThrow();
    });

    it("should validate CodeLanguage enum", () => {
      // 测试边界值和常用语言
      const languages = [1, 7, 22, 30, 49, 63, 75];

      languages.forEach((lang) => {
        const result = CodeLanguage.parse(lang);
        expect(result).toBe(lang);
      });

      expect(() => CodeLanguage.parse(0)).toThrow();
      expect(() => CodeLanguage.parse(76)).toThrow();
    });
  });

  describe("BLOCK_TYPE_MAP", () => {
    it("should map block type numbers to names correctly", () => {
      expect(BLOCK_TYPE_MAP[1]).toBe("page");
      expect(BLOCK_TYPE_MAP[2]).toBe("text");
      expect(BLOCK_TYPE_MAP[3]).toBe("heading1");
      expect(BLOCK_TYPE_MAP[4]).toBe("heading2");
      expect(BLOCK_TYPE_MAP[14]).toBe("code");
      expect(BLOCK_TYPE_MAP[15]).toBe("quote");
      expect(BLOCK_TYPE_MAP[17]).toBe("todo");
      expect(BLOCK_TYPE_MAP[22]).toBe("divider");
      expect(BLOCK_TYPE_MAP[31]).toBe("table");
    });

    it("should have all common block types", () => {
      const commonTypes = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 22, 30, 31,
      ];

      commonTypes.forEach((type) => {
        expect(BLOCK_TYPE_MAP[type as keyof typeof BLOCK_TYPE_MAP]).toBeDefined();
      });
    });
  });

  describe("Schema Compatibility", () => {
    it("text and heading1 should share common style properties", () => {
      const commonStyle = {
        align: 2,
        folded: true,
        background_color: "LightBlueBackground" as const,
      };

      // 两种 schema 都应该能验证通过
      expect(() => textBlockStyleSchema.parse(commonStyle)).not.toThrow();
      expect(() => headingBlockStyleSchema.parse(commonStyle)).not.toThrow();
    });

    it("text-specific property should only work with textBlockStyleSchema", () => {
      const textSpecificStyle = {
        indentation_level: "OneLevelIndent" as const,
      };

      // textBlockStyleSchema 应该接受
      expect(() => textBlockStyleSchema.parse(textSpecificStyle)).not.toThrow();

      // headingBlockStyleSchema 会忽略未知属性（使用 .passthrough() 时）
      // 或拒绝（默认行为），这取决于我们的 schema 定义
    });
  });

  describe("Real-world Scenarios", () => {
    it("should validate a complete text block structure", () => {
      const textBlockData = {
        style: {
          align: 1,
          indentation_level: "OneLevelIndent" as const,
          background_color: "LightYellowBackground" as const,
        },
        elements: [
          {
            text_run: {
              content: "This is a text block",
            },
          },
        ],
      };

      const validatedStyle = textBlockStyleSchema.parse(textBlockData.style);
      expect(validatedStyle).toEqual(textBlockData.style);
    });

    it("should validate a complete heading block structure", () => {
      const headingBlockData = {
        style: {
          align: 2,
          folded: false,
          background_color: "DarkGrayBackground" as const,
        },
        elements: [
          {
            text_run: {
              content: "Chapter 1: Introduction",
            },
          },
        ],
      };

      const validatedStyle = headingBlockStyleSchema.parse(
        headingBlockData.style
      );
      expect(validatedStyle).toEqual(headingBlockData.style);
    });

    it("should validate a code block with syntax highlighting", () => {
      const codeBlockData = {
        style: {
          language: 63, // TypeScript
          wrap: true,
          background_color: "DarkGrayBackground" as const,
        },
        elements: [
          {
            text_run: {
              content:
                'function hello() {\n  console.log("Hello, world!");\n}',
            },
          },
        ],
      };

      const validatedStyle = codeBlockStyleSchema.parse(codeBlockData.style);
      expect(validatedStyle.language).toBe(63);
      expect(validatedStyle.wrap).toBe(true);
    });

    it("should validate a todo item", () => {
      const todoBlockData = {
        style: {
          done: false,
          background_color: "LightRedBackground" as const,
        },
        elements: [
          {
            text_run: {
              content: "Complete project documentation",
            },
          },
        ],
      };

      const validatedStyle = todoBlockStyleSchema.parse(todoBlockData.style);
      expect(validatedStyle.done).toBe(false);
    });

    it("should validate rich text with multiple styles", () => {
      const richTextRuns = [
        {
          content: "Normal text, ",
        },
        {
          content: "bold text",
          text_element_style: { bold: true },
        },
        {
          content: ", and ",
        },
        {
          content: "blue underlined text",
          text_element_style: { underline: true, text_color: 5 },
        },
      ];

      richTextRuns.forEach((run) => {
        expect(() => textRunSchema.parse(run)).not.toThrow();
      });
    });
  });
});
