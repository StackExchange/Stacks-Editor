import { linkPasteHandler } from "../../../src/rich-text/plugins/link-paste-handler";
import "../../matchers";
import {
    applySelection,
    cleanupPasteSupport,
    createState,
    createView,
    dispatchPasteEvent,
    setupPasteSupport,
} from "../test-helpers";

const nonURLTestData = [
    "not a URL",
    "https://example.org but not by itself",
    "URL https://example.org in the middle",
];

const URLTestData = [
    "https://example.org",
    "https://example.org/wiki/BestSubjectEver",
    "https://sub.complicated.domain:8080/path/to/whatever.png#hash?query=parameter%20test",
];

describe("linkPasteHandler plugin", () => {
    beforeAll(setupPasteSupport);
    afterAll(cleanupPasteSupport);

    it.each(nonURLTestData)(
        "should handle pasting non-URL text (%#)",
        (text) => {
            const view = createView(createState("", [linkPasteHandler]));

            dispatchPasteEvent(view.dom, {
                "text/plain": text,
            });

            const insertedNode = view.state.doc.nodeAt(
                view.state.selection.from - 1
            );

            expect(insertedNode.isText).toBe(true);
            expect(insertedNode.text).toBe(text);
            expect(insertedNode.marks).toHaveLength(0); // not a link
        }
    );

    it.each(URLTestData)(
        "should handle pasting URL text without existing selection (%#)",
        (text) => {
            const view = createView(createState("", [linkPasteHandler]));

            dispatchPasteEvent(view.dom, {
                "text/plain": text,
            });

            const insertedNode = view.state.doc.nodeAt(
                view.state.selection.from - 1
            );

            expect(insertedNode.isText).toBe(true);
            expect(insertedNode.text).toBe(text);
            expect(insertedNode.marks).toHaveLength(1);
            expect(insertedNode.marks[0].type.name).toBe("link");
            expect(insertedNode.marks[0].attrs.href).toBe(text);
            expect(insertedNode.marks[0].attrs.markup).toBe("linkify");
            expect(insertedNode.marks[0].attrs.title).toBeNull();
        }
    );

    // TODO: Add more complex test cases: pasting across new lines, pasting
    // with multiple node types selected (e.g. h1 + p), selections with invalid marks
    // or nodes in them, etc.
    it.each(URLTestData)(
        "should use existing selection as link text (%#)",
        (text) => {
            let state = createState("<p>my example link</p>", [
                linkPasteHandler,
            ]);
            state = applySelection(state, 0, 15);
            const view = createView(state);

            dispatchPasteEvent(view.dom, {
                "text/plain": text,
            });

            const insertedNode = view.state.doc.nodeAt(
                view.state.selection.from - 1
            );

            expect(insertedNode.isText).toBe(true);
            expect(insertedNode.text).toBe("my example link");
            expect(insertedNode.marks).toHaveLength(1);
            expect(insertedNode.marks[0].type.name).toBe("link");
            expect(insertedNode.marks[0].attrs.href).toBe(text);
            expect(insertedNode.marks[0].attrs.markup).toBeNull();
            expect(insertedNode.marks[0].attrs.title).toBeNull();
        }
    );

    it.each(URLTestData)(
        "should gracefully paste into inline code (%#)",
        (text) => {
            let state = createState("<code>int i = 5;</code>", [
                linkPasteHandler,
            ]);
            state = applySelection(state, 3);
            const view = createView(state);

            dispatchPasteEvent(view.dom, {
                "text/plain": text,
            });

            const node = view.state.doc.nodeAt(view.state.selection.from - 1);

            expect(node.isText).toBe(true);

            expect(node.text).toBe(`int${text} i = 5;`);
            expect(node.marks).toHaveLength(1);
            expect(node.marks[0].type.name).toBe("code");
        }
    );

    it.each(URLTestData)(
        "should gracefully paste into a code block (%#)",
        (text) => {
            let state = createState(
                `<pre>int i = 5;
i++;
Console.WriteLine(i);</pre>`,
                [linkPasteHandler]
            );
            state = applySelection(state, 15);
            const view = createView(state);

            dispatchPasteEvent(view.dom, {
                "text/plain": text,
            });

            const node = view.state.selection.$from.node();

            expect(node.type.name).toBe("code_block");
            expect(node.textContent).toBe(`int i = 5;
i++;${text}
Console.WriteLine(i);`);
            expect(node.marks).toHaveLength(0);
        }
    );
});
