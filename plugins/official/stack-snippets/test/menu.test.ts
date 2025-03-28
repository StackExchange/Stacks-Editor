import { EditorType, MenuBlock, createMenuEntries } from "../../../../src";
import { RichTextHelpers } from "../../../../test/";
import { buildSnippetMenuEntries } from "./stack-snippet-helpers";

function getEntryByKey(blocks: MenuBlock[], key: string) {
    return blocks
        .map((b) => b.entries)
        .reduce((p, n) => [...p, ...n])
        .find((e) => e?.key === key);
}

const coreEntries = createMenuEntries(
    RichTextHelpers.testRichTextSchema,
    {},
    EditorType.RichText
);

it("should show menu if snippets configured", () => {
    const snippetEntries = buildSnippetMenuEntries(coreEntries);

    expect(getEntryByKey(coreEntries, "openSnippetModal")).toBeUndefined();
    expect(getEntryByKey(snippetEntries, "openSnippetModal")).toBeDefined();
});
