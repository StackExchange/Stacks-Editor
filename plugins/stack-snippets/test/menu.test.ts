//TODO: Move to plugins folder
import {createMenuEntries, MenuBlock} from "../../../src/shared/menu";
import { EditorType } from "../../../src";
import {testRichTextSchema} from "../../../test/rich-text/test-helpers";
import {buildSnippetSchema} from "./stack-snippet-helpers";

function getEntryByKey(blocks: MenuBlock[], key: string) {
    return blocks
        .map((b) => b.entries)
        .reduce((p, n) => [...p, ...n])
        .find((e) => e?.key === key);
}

it("should show menu if snippets configured", () => {
    const withEntry = createMenuEntries(
        buildSnippetSchema(),
        {},
        EditorType.RichText
    );
    const without = createMenuEntries(
        testRichTextSchema,
        {},
        EditorType.RichText
    );

    expect(getEntryByKey(withEntry, "openSnippetModal")).toBeDefined();
    expect(getEntryByKey(without, "openSnippetModal")).toBeUndefined();
});
