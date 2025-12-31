import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 名词解释术语项
 */
export interface GlossaryTerm {
  name: string;
  desc: string;
  alias?: string;
  docs?: string[];
  images?: string[];
  links?: string[];
}

/**
 * 名词解释设置列定义
 */
interface GlossaryColumn {
  dataIndex: string;
  fixed?: string;
  minWidth: number;
  name: string;
  width: number;
}

/**
 * 名词解释设置
 */
interface GlossarySetting {
  columns: GlossaryColumn[];
  mode: string;
}

/**
 * 名词解释列表项（完整结构）
 */
interface GlossaryListItem {
  name: string;
  alias: string;
  desc: string;
  docs: string[];
  images: string[];
  links: string[];
}

/**
 * Glossary Add-ons Record 内部结构
 */
interface GlossaryRecord {
  setting: GlossarySetting;
  list: GlossaryListItem[];
}

/**
 * Glossary Block Add-ons 结构
 */
interface GlossaryAddOns {
  component_id: string;
  component_type_id: string;
  record: string; // JSON 字符串化的 GlossaryRecord
}

/**
 * Glossary Block 完整输出 Schema
 */
const glossaryBlockOutputSchema = {
  block_type: z.literal(40).describe("块类型，名词解释块固定为 40"),
  add_ons: z
    .object({
      component_id: z.string().describe("组件 ID，创建时为空字符串"),
      component_type_id: z
        .string()
        .describe("组件类型 ID，固定为 blk_604dc919d3c0800173e7963c"),
      record: z.string().describe("名词解释配置的 JSON 字符串"),
    })
    .describe("名词解释块的附加配置"),
};

/**
 * 术语输入 Schema
 */
const termSchema = z.object({
  name: z.string().min(1).describe("术语名称"),
  desc: z.string().min(1).describe("术语描述/解释"),
  alias: z.string().optional().describe("术语别名，可选"),
});

/**
 * 构建名词解释 Block 工具
 *
 * 用于构建飞书文档的名词解释块数据结构，不执行实际的 API 调用。
 * 返回的数据可用于 create_nested_blocks 等 API。
 *
 * 名词解释组件用于在文档中创建术语表/词汇表，适合技术文档、产品说明等场景。
 *
 * @example
 * // 创建一个简单的名词解释块
 * terms: [
 *   { name: "API", desc: "应用程序编程接口" },
 *   { name: "SDK", desc: "软件开发工具包", alias: "开发包" }
 * ]
 */
export const buildGlossaryBlock = defineTool({
  name: "build_glossary_block",
  description: {
    summary:
      "构建飞书文档的名词解释块数据结构。用于创建术语表/词汇表，每个术语包含名称、描述和可选的别名。",
    bestFor:
      "创建技术文档的术语表、产品说明的名词解释、项目文档的词汇定义、知识库的概念解释",
    notRecommendedFor:
      "需要直接操作文档时（请使用 create_nested_blocks）、需要复杂格式化的内容（名词解释仅支持简单文本）",
  },
  inputSchema: {
    terms: z
      .array(termSchema)
      .min(1)
      .describe(
        "术语列表，每个术语包含 name（名称）、desc（描述）和可选的 alias（别名）",
      ),
  },
  outputSchema: glossaryBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    // 构建 setting 配置
    const setting: GlossarySetting = {
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
    };

    // 构建术语列表
    const list: GlossaryListItem[] = args.terms.map((term) => ({
      name: term.name,
      alias: term.alias || "",
      desc: term.desc,
      docs: [],
      images: [],
      links: [],
    }));

    // 构建 record 对象并序列化为 JSON 字符串
    const record: GlossaryRecord = {
      setting,
      list,
    };

    const block = {
      block_type: 40 as const,
      add_ons: {
        component_id: "",
        component_type_id: "blk_604dc919d3c0800173e7963c",
        record: JSON.stringify(record),
      } satisfies GlossaryAddOns,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(block, null, 2),
        },
      ],
      structuredContent: block,
    };
  },
});
