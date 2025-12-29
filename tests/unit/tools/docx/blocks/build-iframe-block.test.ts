import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildIframeBlock } from "../../../../../src/tools/docx/blocks/build-iframe-block.js";

// Mock fetch for FlashSite API
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Type for testing invalid inputs
type PartialInput = Partial<Parameters<typeof buildIframeBlock.callback>[1]>;

describe("buildIframeBlock", () => {
  const context = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildIframeBlock.name).toBe("build_iframe_block");
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildIframeBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildIframeBlock.description).toBeDefined();
      if (typeof buildIframeBlock.description === "object") {
        expect(buildIframeBlock.description.summary).toContain("Iframe");
      }
    });

    it("should have inputSchema", () => {
      expect(buildIframeBlock.inputSchema).toBeDefined();
      expect(buildIframeBlock.inputSchema).toHaveProperty("url");
      expect(buildIframeBlock.inputSchema).toHaveProperty("html");
    });

    it("should have outputSchema", () => {
      expect(buildIframeBlock.outputSchema).toBeDefined();
      expect(buildIframeBlock.outputSchema).toHaveProperty("block_type");
      expect(buildIframeBlock.outputSchema).toHaveProperty("iframe");
    });
  });

  describe("callback with url", () => {
    it("should build iframe block with url", async () => {
      const result = await buildIframeBlock.callback(context, {
        url: "https://example.com/embed",
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 26,
        iframe: {
          component: {
            iframe_type: 1,
            url: "https://example.com/embed",
          },
        },
      });
    });

    it("should return correct block_type (26)", async () => {
      const result = await buildIframeBlock.callback(context, {
        url: "https://example.com",
      });

      expect(result.structuredContent.block_type).toBe(26);
    });

    it("should return JSON string in content", async () => {
      const result = await buildIframeBlock.callback(context, {
        url: "https://example.com",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.block_type).toBe(26);
      expect(parsed.iframe.component.url).toBe("https://example.com");
    });

    it("should not call FlashSite API when url is provided", async () => {
      await buildIframeBlock.callback(context, {
        url: "https://example.com/embed",
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("callback with html", () => {
    it("should deploy html to FlashSite and build iframe block", async () => {
      const mockFlashSiteResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            id: "page_123",
            url: "https://flashsite.tapeless.eu.org/pages/page_123",
          }),
      };

      mockFetch.mockResolvedValue(mockFlashSiteResponse);

      const htmlContent = "<!DOCTYPE html><html><body>Hello</body></html>";
      const result = await buildIframeBlock.callback(context, {
        html: htmlContent,
      });

      // Verify FlashSite API was called
      expect(mockFetch).toHaveBeenCalledWith(
        "https://flashsite.tapeless.eu.org/pages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ html: htmlContent }),
        }
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        block_type: 26,
        iframe: {
          component: {
            iframe_type: 1,
            url: "https://flashsite.tapeless.eu.org/pages/page_123",
          },
        },
      });
    });

    it("should handle complex HTML content", async () => {
      const mockFlashSiteResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            url: "https://flashsite.tapeless.eu.org/pages/abc",
          }),
      };

      mockFetch.mockResolvedValue(mockFlashSiteResponse);

      const complexHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body>
            <h1>Hello World</h1>
            <script>console.log('test');</script>
          </body>
        </html>
      `;

      const result = await buildIframeBlock.callback(context, {
        html: complexHtml,
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent.iframe.component.url).toBe(
        "https://flashsite.tapeless.eu.org/pages/abc"
      );
    });
  });

  describe("error handling", () => {
    it("should return error when neither url nor html provided", async () => {
      const result = await buildIframeBlock.callback(context, {} as PartialInput);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Error: Either url or html must be provided"
      );
    });

    it("should return error when both url and html provided", async () => {
      const result = await buildIframeBlock.callback(context, {
        url: "https://example.com",
        html: "<html></html>",
      } as PartialInput);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Error: Only one of url or html should be provided, not both"
      );
    });

    it("should return error when FlashSite API fails with HTTP error", async () => {
      const mockFlashSiteResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      mockFetch.mockResolvedValue(mockFlashSiteResponse);

      const result = await buildIframeBlock.callback(context, {
        html: "<html></html>",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("FlashSite API error");
      expect(result.content[0].text).toContain("500");
    });

    it("should return error when FlashSite API returns 400", async () => {
      const mockFlashSiteResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
      };

      mockFetch.mockResolvedValue(mockFlashSiteResponse);

      const result = await buildIframeBlock.callback(context, {
        html: "<html></html>",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("400");
    });

    it("should return error when FlashSite API does not return url", async () => {
      const mockFlashSiteResponse = {
        ok: true,
        json: () => Promise.resolve({ id: "page_123" }), // No url
      };

      mockFetch.mockResolvedValue(mockFlashSiteResponse);

      const result = await buildIframeBlock.callback(context, {
        html: "<html></html>",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "FlashSite API did not return a URL"
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await buildIframeBlock.callback(context, {
        html: "<html></html>",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("Error: Network error");
    });

    it("should handle string errors", async () => {
      mockFetch.mockRejectedValue("Connection refused");

      const result = await buildIframeBlock.callback(context, {
        html: "<html></html>",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("Error: Connection refused");
    });

    it("should handle JSON parse errors from FlashSite", async () => {
      const mockFlashSiteResponse = {
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      };

      mockFetch.mockResolvedValue(mockFlashSiteResponse);

      const result = await buildIframeBlock.callback(context, {
        html: "<html></html>",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid JSON");
    });
  });

  describe("structuredContent", () => {
    it("should return structuredContent with url", async () => {
      const result = await buildIframeBlock.callback(context, {
        url: "https://example.com/embed",
      });

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent).toEqual({
        block_type: 26,
        iframe: {
          component: {
            iframe_type: 1,
            url: "https://example.com/embed",
          },
        },
      });
    });

    it("should have iframe_type always set to 1", async () => {
      const result = await buildIframeBlock.callback(context, {
        url: "https://example.com",
      });

      expect(result.structuredContent.iframe.component.iframe_type).toBe(1);
    });
  });
});
