import { EditorType } from "../../../src";
import { createMenuEntries, MenuBlock } from "../../../src/shared/menu";
import { testRichTextSchema } from "../../rich-text/test-helpers";

function getEntryByKey(blocks: MenuBlock[], key: string) {
    return blocks
        .map((b) => b.entries)
        .reduce((p, n) => [...p, ...n])
        .find((e) => e?.key === key);
}

describe("menu entries", () => {
    it("should create menus per editorType", () => {
        const richText = createMenuEntries(
            testRichTextSchema,
            {
                parserFeatures: {
                    tables: true,
                },
            },
            EditorType.RichText
        );
        const commonmark = createMenuEntries(
            testRichTextSchema,
            {
                parserFeatures: {
                    tables: true,
                },
            },
            EditorType.Commonmark
        );

        expect(richText).not.toStrictEqual(commonmark);

        // richText menu has a custom table dropdown, while commonmark doesn't
        expect(getEntryByKey(richText, "table-dropdown")).toHaveProperty("key");
        expect(getEntryByKey(commonmark, "table-dropdown")).toBeUndefined();
    });

    it("should alter entries depending on passed options", () => {
        const commonmark1 = createMenuEntries(
            testRichTextSchema,
            {
                parserFeatures: {
                    tables: true,
                },
            },
            EditorType.Commonmark
        );
        const commonmark2 = createMenuEntries(
            testRichTextSchema,
            {
                parserFeatures: {
                    tables: false,
                },
            },
            EditorType.Commonmark
        );

        expect(getEntryByKey(commonmark1, "insertTable")).toBeDefined();
        expect(getEntryByKey(commonmark2, "insertTable")).toBeUndefined();
    });
});
