import { describe, it, expect } from "vitest";
import { buildCatalogNavigationBlock } from "../../../../../src/tools/docx/blocks/build-catalog-navigation-block.js";

describe("buildCatalogNavigationBlock", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(buildCatalogNavigationBlock.name).toBe(
        "build_catalog_navigation_block",
      );
    });

    it("should have readOnlyHint annotation", () => {
      expect(buildCatalogNavigationBlock.annotations?.readOnlyHint).toBe(true);
    });

    it("should have description", () => {
      expect(buildCatalogNavigationBlock.description).toBeDefined();
      // description is formatted as string by formatDescription
      expect(typeof buildCatalogNavigationBlock.description).toBe("string");
      expect(buildCatalogNavigationBlock.description).toContain("目录导航");
    });

    it("should have inputSchema", () => {
      expect(buildCatalogNavigationBlock.inputSchema).toBeDefined();
    });

    it("should have outputSchema", () => {
      expect(buildCatalogNavigationBlock.outputSchema).toBeDefined();
    });
  });

  describe("callback", () => {
    const context = {};
    const extra = {} as any;

    it("should build a catalog navigation block with default values", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent.block_type).toBe(40);
      expect(result.structuredContent.add_ons.component_id).toBe("");
      expect(result.structuredContent.add_ons.component_type_id).toBe(
        "blk_637dcc698597401c1a8fd711",
      );

      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.viewType).toBe("normal");
      expect(record.showCataLogLevel).toBe(3);
      expect(record.isShowAllLevel).toBe(true);
      expect(record.ignoreCataLogRecordIds).toEqual([]);
    });

    it("should build a catalog navigation block with card view", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        { viewType: "card" } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.viewType).toBe("card");
    });

    it("should build a catalog navigation block with custom showCatalogLevel", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        { showCatalogLevel: 5 } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.showCataLogLevel).toBe(5);
    });

    it("should build a catalog navigation block with isShowAllLevel false", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        { isShowAllLevel: false } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.isShowAllLevel).toBe(false);
    });

    it("should build a catalog navigation block with ignoreCatalogRecordIds", async () => {
      const ignoreCatalogRecordIds = ["record_id_1", "record_id_2"];
      const result = await buildCatalogNavigationBlock.callback(
        context,
        { ignoreCatalogRecordIds } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.ignoreCataLogRecordIds).toEqual(ignoreCatalogRecordIds);
    });

    it("should build a catalog navigation block with all custom options", async () => {
      const args = {
        viewType: "card",
        showCatalogLevel: 2,
        isShowAllLevel: false,
        ignoreCatalogRecordIds: ["id1", "id2", "id3"],
      };
      const result = await buildCatalogNavigationBlock.callback(
        context,
        args as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.viewType).toBe("card");
      expect(record.showCataLogLevel).toBe(2);
      expect(record.isShowAllLevel).toBe(false);
      expect(record.ignoreCataLogRecordIds).toEqual(["id1", "id2", "id3"]);
    });

    it("should return correct block_type (40)", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.structuredContent.block_type).toBe(40);
    });

    it("should have correct component_type_id for catalog navigation", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.structuredContent.add_ons.component_type_id).toBe(
        "blk_637dcc698597401c1a8fd711",
      );
    });

    it("should have empty component_id", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.structuredContent.add_ons.component_id).toBe("");
    });

    it("should return JSON string in content", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        {} as any,
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
      const result = await buildCatalogNavigationBlock.callback(
        context,
        {} as any,
        extra,
      );

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.block_type).toBe(40);
      expect(result.structuredContent.add_ons).toBeDefined();
    });

    it("should handle minimum showCatalogLevel (1)", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        { showCatalogLevel: 1 } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.showCataLogLevel).toBe(1);
    });

    it("should handle maximum showCatalogLevel (6)", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        { showCatalogLevel: 6 } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.showCataLogLevel).toBe(6);
    });

    it("should handle empty ignoreCatalogRecordIds array", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        { ignoreCatalogRecordIds: [] } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.ignoreCataLogRecordIds).toEqual([]);
    });

    it("should handle normal viewType explicitly", async () => {
      const result = await buildCatalogNavigationBlock.callback(
        context,
        { viewType: "normal" } as any,
        extra,
      );

      expect(result.isError).toBeUndefined();
      const record = JSON.parse(result.structuredContent.add_ons.record);
      expect(record.viewType).toBe("normal");
    });
  });
});
