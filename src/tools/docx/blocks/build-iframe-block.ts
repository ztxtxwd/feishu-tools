import { z } from "zod";
import { defineTool } from "../../../define-tool.js";

/**
 * 通过 FlashSite API 部署 HTML 内容并获取 URL
 */
async function deployHtmlToFlashSite(html: string): Promise<string> {
  const response = await fetch("https://flashsite.tapeless.eu.org/pages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html }),
  });

  if (!response.ok) {
    throw new Error(
      `FlashSite API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("FlashSite API did not return a URL");
  }

  return data.url;
}

/**
 * Iframe Block 输出 Schema
 */
const iframeBlockOutputSchema = {
  block_type: z.literal(26).describe("块类型，Iframe 块固定为 26"),
  iframe: z
    .object({
      component: z.object({
        iframe_type: z.literal(1).describe("iframe 类型，固定为 1"),
        url: z.string().describe("iframe 加载的 URL"),
      }),
    })
    .describe("iframe 块内容"),
};

/**
 * 构建 Iframe Block 工具
 *
 * 用于构建飞书文档的 iframe 块数据结构。
 * 支持直接提供 URL 或提供 HTML 内容（通过 FlashSite API 部署后获取 URL）。
 * 返回的数据可用于 create_block 等 API。
 */
export const buildIframeBlock = defineTool({
  name: "build_iframe_block",
  description: {
    summary:
      "构建飞书文档的 Iframe 块数据结构。支持直接嵌入 URL 或部署 HTML 内容后嵌入。",
    bestFor:
      "嵌入外部网页、嵌入自定义 HTML 内容、在文档中展示交互式内容",
    notRecommendedFor:
      "嵌入图片（请使用 build_image_block）、嵌入附件文件（请使用 create_file_block）",
  },
  inputSchema: {
    url: z
      .string()
      .optional()
      .describe("iframe 要加载的 URL。与 html 二选一"),
    html: z
      .string()
      .optional()
      .describe(
        "要嵌入的 HTML 内容。会通过 FlashSite API 部署后获取 URL。与 url 二选一"
      ),
  },
  outputSchema: iframeBlockOutputSchema,
  annotations: {
    readOnlyHint: true,
  },
  callback: async (_context, args) => {
    // 验证输入参数：url 和 html 二选一
    if (!args.url && !args.html) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Either url or html must be provided",
          },
        ],
        isError: true,
      };
    }

    if (args.url && args.html) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Only one of url or html should be provided, not both",
          },
        ],
        isError: true,
      };
    }

    try {
      // 确定最终的 URL
      let finalUrl: string;
      if (args.url) {
        finalUrl = args.url;
      } else {
        // 部署 HTML 到 FlashSite
        finalUrl = await deployHtmlToFlashSite(args.html!);
      }

      const block = {
        block_type: 26 as const,
        iframe: {
          component: {
            iframe_type: 1 as const,
            url: finalUrl,
          },
        },
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
});
