/**
 * Heading 块工具 (Heading1~9)
 *
 * 使用工厂函数批量创建
 */
import {
  createTextBlockTool,
  type TextBlockConfig,
} from "./factories/text-block-factory.js";

/**
 * Heading 配置列表
 */
const headingConfigs: Array<{
  level: number;
  blockType: number;
  displayName: string;
}> = [
  { level: 1, blockType: 3, displayName: "一级标题" },
  { level: 2, blockType: 4, displayName: "二级标题" },
  { level: 3, blockType: 5, displayName: "三级标题" },
  { level: 4, blockType: 6, displayName: "四级标题" },
  { level: 5, blockType: 7, displayName: "五级标题" },
  { level: 6, blockType: 8, displayName: "六级标题" },
  { level: 7, blockType: 9, displayName: "七级标题" },
  { level: 8, blockType: 10, displayName: "八级标题" },
  { level: 9, blockType: 11, displayName: "九级标题" },
];

/**
 * 创建 Heading 块配置
 */
function createHeadingConfig(config: {
  level: number;
  blockType: number;
  displayName: string;
}): TextBlockConfig {
  return {
    blockType: config.blockType,
    blockName: `heading${config.level}`,
    displayName: config.displayName,
    description: {
      summary: `构建飞书文档的 ${config.displayName} 块数据结构。支持富文本格式（加粗、斜体、链接等）、@用户、@文档等元素。`,
      bestFor: `创建文档${config.displayName}、章节标题`,
      notRecommendedFor:
        "需要直接操作文档时（请使用 create_block）、只需要简单纯文本时（请使用 convert_content_to_blocks）",
    },
    supportsFolded: true,
  };
}

// Heading1
export const buildHeading1Block = createTextBlockTool(
  createHeadingConfig(headingConfigs[0])
);

// Heading2
export const buildHeading2Block = createTextBlockTool(
  createHeadingConfig(headingConfigs[1])
);

// Heading3
export const buildHeading3Block = createTextBlockTool(
  createHeadingConfig(headingConfigs[2])
);

// Heading4
export const buildHeading4Block = createTextBlockTool(
  createHeadingConfig(headingConfigs[3])
);

// Heading5
export const buildHeading5Block = createTextBlockTool(
  createHeadingConfig(headingConfigs[4])
);

// Heading6
export const buildHeading6Block = createTextBlockTool(
  createHeadingConfig(headingConfigs[5])
);

// Heading7
export const buildHeading7Block = createTextBlockTool(
  createHeadingConfig(headingConfigs[6])
);

// Heading8
export const buildHeading8Block = createTextBlockTool(
  createHeadingConfig(headingConfigs[7])
);

// Heading9
export const buildHeading9Block = createTextBlockTool(
  createHeadingConfig(headingConfigs[8])
);
