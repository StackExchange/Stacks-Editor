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
    const validSnippet = (hide: string) =>
        schema.nodes.stack_snippet.createChecked(
            {
                id: "1234",
                babel: "true",
                babelPresetReact: "true",
                babelPresetTS: "null",
                console: "true",
                hide: hide,
            },
            langNode
        );

    const buildView = (
        options?: StackSnippetOptions,
        hide: string = "false"
    ): EditorView => {
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
                validSnippet(hide)
            )
        );

        return view;
    };

    const findSnippetControls = (rendered: Element): NodeListOf<Element> =>
        rendered.querySelectorAll("div.snippet-buttons > button");

    it("should render snippet buttons if renderer provided", () => {
        const view = buildView({
            renderer: () => Promise.resolve(null),
            openSnippetsModal: () => {},
        });

        const snippetButtons = findSnippetControls(view.dom);

        expect(snippetButtons).toHaveLength(2);
        expect(snippetButtons[0].attributes.getNamedItem("title").value).toBe(
            "Run code snippet"
        );
        expect(
            snippetButtons[0].attributes.getNamedItem("aria-label").value
        ).toBe("Run code snippet");
        expect(snippetButtons[1].attributes.getNamedItem("title").value).toBe(
            "Edit code snippet"
        );
        expect(
            snippetButtons[1].attributes.getNamedItem("aria-label").value
        ).toBe("Edit code snippet");
    });

    it("should not render snippet buttons if no renderer provided", () => {
        const view = buildView();

        const snippetButtons = findSnippetControls(view.dom);

        expect(snippetButtons).toHaveLength(0);
    });

    describe("Run Code Snippet button", () => {
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
                ".snippet-buttons > button.s-btn"
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
                ".snippet-buttons > button.s-btn"
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

    describe("Edit Snippet", () => {
        it("should call openSnippetModal when clicked", async () => {
            let openCalled = false;
            const view = buildView({
                renderer: () => {
                    return Promise.resolve(null);
                },
                openSnippetsModal: () => {
                    openCalled = true;
                },
            });
            const editCodeButton = view.dom.querySelectorAll(
                ".snippet-buttons > button.s-btn"
            )[1];
            //Double check we've grabbed the right button
            expect(editCodeButton.textContent).toContain("Edit");

            (<HTMLButtonElement>editCodeButton).click();
            await RichTextHelpers.sleepAsync(0);

            expect(openCalled).toBeTruthy();
        });
    });

    describe("Show/Hide Snippet", () => {
        it("should render show/hide link if hide attr is true", () => {
            const view = buildView(undefined, "true");
            const toggleLink = view.dom.querySelectorAll(".snippet-toggle");

            expect(toggleLink).toHaveLength(1);
            expect(toggleLink[0].textContent).toBe("Hide code snippet");
        });

        it("should not render show/hide link if hide attr is false", () => {
            const view = buildView(undefined, "false");
            const toggleLink = view.dom.querySelectorAll(".snippet-toggle");

            expect(toggleLink).toHaveLength(0);
        });

        it("should toggle visibility of code snippet when show/hide link is clicked", () => {
            const view = buildView(undefined, "true");
            const toggleLink = view.dom.querySelector(".snippet-toggle");
            const snippetCode = view.dom.querySelector(".snippet-code");

            // Initial state: Code is visible
            expect((<HTMLDivElement>snippetCode).style.display).toBe("");
            expect(toggleLink.textContent).toBe("Hide code snippet");

            // Click to hide
            (<HTMLAnchorElement>toggleLink).click();
            expect((<HTMLDivElement>snippetCode).style.display).toBe("none");
            expect(toggleLink.textContent).toBe("Show code snippet");

            // Click to show
            (<HTMLAnchorElement>toggleLink).click();
            expect((<HTMLDivElement>snippetCode).style.display).toBe("");
            expect(toggleLink.textContent).toBe("Hide code snippet");
        });
    });

    describe("Fullscren/Return Snippet", () => {
        it("should trigger onFullscreenExpand callback if defined", () => {
            let fullscreenExpandCalled = false;
            const view = buildView({
                renderer: () => {
                    return Promise.resolve(null);
                },
                openSnippetsModal: () => {},
                onFullscreenExpand: () => {
                    fullscreenExpandCalled = true;
                },
            });

            const [fullscreenButton] = view.dom.querySelectorAll(
                ".snippet-result-buttons > button.s-btn[aria-label='Expand Snippet']"
            );

            //Fullscreen
            (<HTMLAnchorElement>fullscreenButton).click();

            expect(fullscreenExpandCalled).toBe(true);
        });

        it("should trigger onFullscreenReturn callback if defined", () => {
            let fullscreenReturnCalled = false;
            const view = buildView({
                renderer: () => {
                    return Promise.resolve(null);
                },
                openSnippetsModal: () => {},
                onFullscreenReturn: () => {
                    fullscreenReturnCalled = true;
                },
            });
            const [fullscreenButton] = view.dom.querySelectorAll(
                ".snippet-result-buttons > button.s-btn[aria-label='Expand Snippet']"
            );
            const [fullscreenReturn] = view.dom.querySelectorAll(
                ".snippet-result-buttons > button.s-btn[aria-label='Return to post']"
            );

            //Fullscreen
            (<HTMLAnchorElement>fullscreenButton).click();
            //And then return
            (<HTMLAnchorElement>fullscreenReturn).click();

            expect(fullscreenReturnCalled).toBe(true);
        });
    });
});
