import { CommonmarkEditor } from "../../src/commonmark/editor";
import { RichTextEditor } from "../../src/rich-text/editor";
import { schema } from "prosemirror-markdown";
import { externalPluginProvider, normalize } from "../test-helpers";

const target = document.createElement("div");
const markdownRoundTripData = [
    ["**strong**"],
    ["*em*"],
    ["***em and strong***"],
    ["[a link](https://example.com)"],
    ["![an image](https://example.com/img.png)"],
    [`[a link](https://example.com "title")`],
];

describe("commonmark editor view", () => {
    it("should render markdown as is", () => {
        const markdown = "**bold**";

        const view = commonmarkView(markdown);

        expect(view.content).toBe("**bold**");
    });

    it.each(markdownRoundTripData)("should not change markdown", (markdown) => {
        const richView = new RichTextEditor(
            target,
            markdown,
            externalPluginProvider()
        );

        const markdownView = commonmarkView(richView.content);

        expect(markdownView.content).toEqual(markdown);
    });

    it("should render the markdown prosemirror document with code node", () => {
        const markdown = "a link [goes here](https://example.com)";

        const view = commonmarkView(markdown);

        const doc = view.document;
        expect(doc.type.name).toEqual(schema.nodes.doc.name);

        const codeNode = doc.content.firstChild;
        expect(codeNode.type.name).toEqual(schema.nodes.code_block.name);

        const textNode = codeNode.content.firstChild;
        expect(textNode.type.name).toEqual(schema.nodes.text.name);
        expect(textNode.text).toEqual(markdown);
    });

    it("should render an empty markdown prosemirror document with code node", () => {
        const view = commonmarkView("");

        const doc = view.document;
        expect(doc.type.name).toEqual(schema.nodes.doc.name);

        const codeNode = doc.content.firstChild;
        expect(codeNode.type.name).toEqual(schema.nodes.code_block.name);
    });

    describe.skip("entering html in markdown mode", () => {
        it("should not change <hr> when switching back and forth", () => {
            const markdownInput = "<hr>";
            let markdownView = commonmarkView(markdownInput);
            const richView = new RichTextEditor(
                target,
                markdownView.content,
                externalPluginProvider()
            );
            markdownView = commonmarkView(richView.content);

            expect(markdownView.content).toEqual(markdownInput);
        });

        it("should keep newlines when switching back and forth", () => {
            const markdownInput = "<hr>\n\n";
            let markdownView = commonmarkView(markdownInput);
            const richView = new RichTextEditor(
                target,
                markdownView.content,
                externalPluginProvider()
            );
            markdownView = commonmarkView(richView.content);

            expect(markdownView.content).toEqual(markdownInput);
        });
    });

    describe("tables", () => {
        it("should serialize tables", () => {
            const markdown = `
| Table      | With         | Alignments |
| ---------- |:------------:| ----------:|
| left       | center       | right      |
| also left  | **markdown** | also right |
`;

            const serializedTable = new RichTextEditor(
                target,
                markdown,
                externalPluginProvider()
            ).content;

            const expectedSerializedMarkdown = `
| Table | With | Alignments |
| --- |:---:| ---:|
| left | center | right |
| also left | **markdown** | also right |
`;
            expect(serializedTable.trim()).toEqual(
                expectedSerializedMarkdown.trim()
            );
        });
    });

    it.each(["", "# testing some *stuff*"])(
        "should get and set content",
        (content) => {
            const baseContent = "# Here is _some_\n\n> **base** content";
            const view = commonmarkView(baseContent);
            // check the initial value
            expect(view.content).toBe(baseContent);

            // set it
            view.content = content;

            // check that the new value is correct
            expect(view.content).toBe(content);
        }
    );

    describe("external plugins", () => {
        it.todo("should do all the things");
    });

    it("should have syntax highlighting", () => {
        const markdown = "**Hello** _world_!";

        const view = commonmarkView(markdown);
        const dom = view.dom;

        expect(normalize(dom.innerHTML)).toBe(
            `<pre class="s-code-block markdown"><code><span class="hljs-strong hljs-symbol">**</span><span class="hljs-strong">Hello</span><span class="hljs-strong hljs-symbol">**</span> <span class="hljs-emphasis hljs-symbol">_</span><span class="hljs-emphasis">world</span><span class="hljs-emphasis hljs-symbol">_</span>!</code></pre>`
        );
    });
});

function commonmarkView(markdown: string): CommonmarkEditor {
    return new CommonmarkEditor(target, markdown, externalPluginProvider());
}
