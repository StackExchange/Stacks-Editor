import { RichTextHelpers } from "../../../../test";
import { StackSnippetOptions } from "../src/common";
import { EditorView } from "prosemirror-view";
import { EditorState } from "prosemirror-state";
import { stackSnippetPasteHandler } from "../src/paste-handler";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { StackSnippetView } from "../src/snippet-view";
import { buildSnippetSchema } from "./stack-snippet-helpers";

describe("StackSnippetView", () => {
    const schema = buildSnippetSchema();

    const langNode = schema.nodes.stack_snippet_lang.createChecked(
        { language: "js" },
        schema.text("console.log('test');")
    );
    const validSnippet = schema.nodes.stack_snippet.createChecked(
        {
            id: "1234",
            babel: "true",
            babelPresetReact: "true",
            babelPresetTS: "null",
            console: "true",
            hide: "false",
        },
        langNode
    );

    const buildView = (options?: StackSnippetOptions): EditorView => {
        const state = EditorState.create({
            schema: schema,
            plugins: [stackSnippetPasteHandler],
        });
        const view = new EditorView(document.createElement("div"), {
            state: state,
            nodeViews: {
                stack_snippet: (
                    node: ProseMirrorNode,
                    view: EditorView,
                    getPos: () => number
                ) => {
                    return new StackSnippetView(node, view, getPos, options);
                },
            },
        });
        //Render the Snippet, which should be rendered as our StackSnippetView
        view.dispatch(
            view.state.tr.replaceRangeWith(
                0,
                view.state.doc.nodeSize - 2,
                validSnippet
            )
        );

        return view;
    };

    it("should render run code button if renderer provided", () => {
        const view = buildView({
            renderer: () => Promise.resolve(null),
            openSnippetsModal: () => {},
        });
        const runCodeButton = view.dom.querySelectorAll(
            ".snippet-ctas > button.s-btn"
        );

        expect(runCodeButton).toHaveLength(1);
        expect(runCodeButton[0].textContent).toBe("Run code snippet");
    });

    it("should not render run code button if no renderer provided", () => {
        const view = buildView();
        const runCodeButton = view.dom.querySelectorAll(
            ".snippet-ctas > button.s-btn"
        );

        expect(runCodeButton).toHaveLength(0);
    });

    it("should call renderer when button clicked", () => {
        let buttonClicked = false;
        const view = buildView({
            renderer: () => {
                buttonClicked = true;
                return Promise.resolve(null);
            },
            openSnippetsModal: () => {},
        });
        const [runCodeButton] = view.dom.querySelectorAll(
            ".snippet-ctas > button.s-btn"
        );

        (<HTMLButtonElement>runCodeButton).click();

        expect(buttonClicked).toBe(true);
    });

    it("should render returned content when button clicked", async () => {
        const renderDoc =
            document.implementation.createHTMLDocument("test doc");
        const testDiv = document.createElement("div");
        testDiv.textContent = "test!";
        renderDoc.body.appendChild(testDiv);
        const view = buildView({
            renderer: () => {
                return Promise.resolve(renderDoc);
            },
            openSnippetsModal: () => {},
        });
        const [runCodeButton] = view.dom.querySelectorAll(
            ".snippet-ctas > button.s-btn"
        );

        (<HTMLButtonElement>runCodeButton).click();
        // wait for the promise to resolve (immediately) and check that the async content was pulled in
        await RichTextHelpers.sleepAsync(0);

        const [iframe] = view.dom.querySelectorAll(".snippet-box-result");
        //Testing the HTMLIFrameElement is a nightmare, instead we're going to grab it's srcdoc and ensure that it parses back to our document
        const foundDoc = (<HTMLIFrameElement>iframe).srcdoc;
        const resultDoc = document.implementation.createHTMLDocument();
        resultDoc.open();
        resultDoc.write(foundDoc);
        resultDoc.close();
        const [resultDiv] = resultDoc.getElementsByTagName("div");
        expect(resultDiv.textContent).toBe("test!");
    });
});
