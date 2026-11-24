import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Slice } from "prosemirror-model";
import { richTextInputRules } from "../../../../src/rich-text/inputrules";
import { stackOverflowValidateLink } from "../../../../src/shared/utils";
import { MathJaxOptions, MathJaxRenderRequest } from "../src/common";
import { buildMathJaxSchema, mathJaxExternalProvider } from "./test-helpers";
import { StacksEditor } from "../../../../src/stacks-editor/editor";
import { EditorType } from "../../../../src/shared/view";
import { mathJaxPlugin } from "../src/mathJaxPlugin";

/** Create an editor view configured with the core and MathJax input rules. */
function createView(options?: MathJaxOptions): EditorView {
    const provider = mathJaxExternalProvider(options);
    const schema = buildMathJaxSchema(options);
    return new EditorView(document.createElement("div"), {
        state: EditorState.create({
            schema,
            plugins: [
                richTextInputRules(schema, {
                    validateLink: stackOverflowValidateLink,
                }),
                ...provider.plugins.richText,
            ],
        }),
        nodeViews: provider.nodeViews,
    });
}

/** Type text through ProseMirror's handleTextInput pipeline. */
function typeText(view: EditorView, text: string): void {
    for (const character of text) {
        const { from, to } = view.state.selection;
        const handled = view.someProp("handleTextInput", (handler) =>
            handler(view, from, to, character)
        );

        if (!handled) {
            view.dispatch(view.state.tr.insertText(character, from, to));
        }
    }
}

describe("MathJax rich-text input rules", () => {
    const originalIntersectionObserver = global.IntersectionObserver;

    beforeAll(() => {
        global.IntersectionObserver = jest.fn(() => ({
            observe: jest.fn(),
            unobserve: jest.fn(),
            disconnect: jest.fn(),
            takeRecords: jest.fn(),
            root: null as Element | Document | null,
            rootMargin: "0px",
            thresholds: [] as number[],
        })) as unknown as typeof IntersectionObserver;
    });

    afterAll(() => {
        global.IntersectionObserver = originalIntersectionObserver;
    });

    it("renders a completed formula through a full StacksEditor instance", async () => {
        const target = document.createElement("div");
        const editor = new StacksEditor(target, "", {
            editorPlugins: [mathJaxPlugin()],
        });
        const view = editor.editorView;

        view.dom.firstElementChild?.append(document.createTextNode("$x$"));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(view.state.doc.firstChild.firstChild.type.name).toBe(
            "math_inline"
        );
        editor.destroy();
    });

    it.each([
        ["$x^2$", "$", "$", "x^2"],
        ["\\(x^2\\)", "\\(", "\\)", "x^2"],
    ])(
        "renders a completed inline formula while typing: %s",
        (text, openDelimiter, closeDelimiter, source) => {
            const renderer = jest.fn(
                ({
                    container,
                    source: renderedSource,
                }: MathJaxRenderRequest) => {
                    container.textContent = `rendered:${renderedSource}`;
                }
            );
            const view = createView({ renderer });

            typeText(view, `Formula: ${text}`);

            const mathNode = view.state.doc.firstChild.lastChild;
            expect(mathNode.type.name).toBe("math_inline");
            expect(mathNode.attrs).toMatchObject({
                source,
                openDelimiter,
                closeDelimiter,
            });
            expect(renderer).toHaveBeenCalledTimes(1);
            expect(
                view.dom.querySelector(".stacks-editor-math-inline")
                    ?.textContent
            ).toBe(`rendered:${source}`);
        }
    );

    it("renders a formula inserted through a DOM reconciliation transaction", () => {
        const view = createView();

        view.dispatch(view.state.tr.insertText("Formula: $x^2$"));

        expect(view.state.doc.firstChild.lastChild.type.name).toBe(
            "math_inline"
        );
        expect(view.state.doc.firstChild.lastChild.attrs).toMatchObject({
            source: "x^2",
            openDelimiter: "$",
            closeDelimiter: "$",
        });
    });

    it("renders a pasted formula", () => {
        const view = createView();
        const event = {
            clipboardData: {
                getData: () => "Formula: $x^2$",
                files: [],
                types: ["text/plain"],
            },
        } as unknown as ClipboardEvent;

        const handled = view.someProp("handlePaste", (handler) =>
            handler(view, event, Slice.empty)
        );

        expect(handled).toBe(true);
        expect(view.state.doc.firstChild.lastChild.type.name).toBe(
            "math_inline"
        );
        expect(view.state.doc.firstChild.lastChild.attrs.source).toBe("x^2");
    });

    it("preserves a rich-text paste when switching through Markdown", () => {
        const target = document.createElement("div");
        const editor = new StacksEditor(target, "", {
            editorPlugins: [mathJaxPlugin()],
        });
        const content =
            "Texto normal. Precio escapado: \\$5. Código: `$not_math$`. Fórmula: $x^2 + y^2$";
        const event = {
            clipboardData: {
                getData: () => content,
                files: [],
                types: ["text/plain"],
            },
        } as unknown as ClipboardEvent;

        editor.editorView.someProp("handlePaste", (handler) =>
            handler(editor.editorView, event, Slice.empty)
        );
        editor.setView(EditorType.Commonmark);
        editor.setView(EditorType.RichText);

        const mathNodes: string[] = [];
        editor.document.descendants((node) => {
            if (node.type.name === "math_inline") {
                mathNodes.push(node.attrs.source as string);
            }
        });
        expect(mathNodes).toEqual(["x^2 + y^2"]);
        editor.destroy();
    });

    it("renders a multi-paragraph paste with display and inline math", () => {
        const target = document.createElement("div");
        const editor = new StacksEditor(target, "", {
            editorPlugins: [mathJaxPlugin()],
        });
        const content =
            "The quadratic formula is:\n\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\nAnd here is inline math: $x_i = y^2 + 1$.";
        const event = {
            clipboardData: {
                getData: () => content,
                files: [],
                types: ["text/plain"],
            },
        } as unknown as ClipboardEvent;

        const handled = editor.editorView.someProp("handlePaste", (handler) =>
            handler(editor.editorView, event, Slice.empty)
        );

        const mathNodes: Array<{ type: string; source: string }> = [];
        editor.document.descendants((node) => {
            if (["math_inline", "math_block"].includes(node.type.name)) {
                mathNodes.push({
                    type: node.type.name,
                    source: node.attrs.source as string,
                });
            }
        });
        expect(handled).toBe(true);
        expect(mathNodes).toEqual([
            {
                type: "math_block",
                source: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
            },
            { type: "math_inline", source: "x_i = y^2 + 1" },
        ]);
        editor.destroy();
    });

    it.each([
        ["$$x^2$$", "$$", "$$", "x^2"],
        ["\\[x^2\\]", "\\[", "\\]", "x^2"],
    ])(
        "renders a completed display formula while typing: %s",
        (text, openDelimiter, closeDelimiter, source) => {
            const view = createView();

            typeText(view, text);

            expect(view.state.doc.firstChild.type.name).toBe("math_block");
            expect(view.state.doc.firstChild.attrs).toMatchObject({
                source,
                openDelimiter,
                closeDelimiter,
            });
            expect(view.state.doc.lastChild.type.name).toBe("paragraph");
        }
    );

    it("does not render escaped dollars as formulas", () => {
        const view = createView();

        typeText(view, "Price: \\$5");

        expect(view.state.doc.firstChild.childCount).toBe(1);
        expect(view.state.doc.textContent).toBe("Price: \\$5");
    });

    it("does not render formulas while typing inside an inline code span", () => {
        const view = createView();

        typeText(view, "Code: `$notMath$`");

        const code = view.state.doc.firstChild.lastChild;
        expect(code.isText).toBe(true);
        expect(code.text).toBe("$notMath$");
        expect(code.marks.map((mark) => mark.type.name)).toContain("code");
    });

    it("uses custom delimiters while typing", () => {
        const view = createView({
            inlineDelimiters: [["%%", "%%"]],
        });

        typeText(view, "Formula: %%x^2%%");

        expect(view.state.doc.firstChild.lastChild.attrs).toMatchObject({
            source: "x^2",
            openDelimiter: "%%",
            closeDelimiter: "%%",
        });
    });
});
