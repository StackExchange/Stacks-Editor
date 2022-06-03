import { Schema } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { RichTextEditor } from "../../../src/rich-text/editor";
import {
    hideLinkEditor,
    LinkEditor,
    linkEditorPlugin,
    showLinkEditor,
} from "../../../src/rich-text/plugins/link-editor";
import { stackOverflowValidateLink } from "../../../src/shared/utils";
import { applySelection, createState, createView } from "../test-helpers";
import "../../matchers";
import { interfaceManagerPlugin } from "../../../src/shared/prosemirror-plugins/interface-manager";

const editorPlugin = linkEditorPlugin({
    validateLink: stackOverflowValidateLink,
});

function getDecorations(state: EditorState) {
    const pState = state.plugins
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error this isn't a public field, but I don't care
        .find((p) => p.spec?.key?.name === "LinkEditor")
        ?.getState(state) as {
        decorations: DecorationSet;
    };
    return pState.decorations;
}

function getRenderedDecoration(
    state: EditorState,
    editorView?: EditorView
): HTMLElement {
    const decorations = getDecorations(state);
    const decoration = decorations.find(
        state.selection.from
    )[0] as Decoration<unknown>;
    expect(decoration).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pState = state.plugins[0].getState(state);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Oh snap, we're going off the grid!
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const renderer = decoration["type"].toDOM.bind(pState.linkTooltip) as (
        view: EditorView
    ) => HTMLElement;

    const view = editorView || createView(state);

    return renderer(view);
}

describe("link-editor", () => {
    describe("plugin view", () => {
        let pluginContainer: Element;
        let view: RichTextEditor;
        let editor: LinkEditor;

        beforeEach(() => {
            pluginContainer = document.createElement("div");
            view = richTextView("", () => pluginContainer);
            editor = new LinkEditor(view.editorView, stackOverflowValidateLink);
        });

        it("should show link editor", () => {
            expect(editor.viewContainer.parentElement).toBeNull();

            showLinkEditor(view.editorView);
            editor.update(view.editorView);
            const updatedUploadContainer =
                pluginContainer.querySelector(".js-link-editor");

            expect(updatedUploadContainer.parentElement).toBeTruthy();
        });

        it("should focus first input when showing image uploader", () => {
            // we need to add our DOM to the doc's body in order to make jsdom's "focus" handling work
            // see https://github.com/jsdom/jsdom/issues/2586#issuecomment-742593116
            document.body.appendChild(pluginContainer);

            expect(editor.viewContainer.parentElement).toBeNull();

            showLinkEditor(view.editorView);
            editor.update(view.editorView);
            const input = pluginContainer.querySelector(
                ".js-link-editor .js-link-editor-href"
            );

            // the actual element changes when the plugin state is updated, so we can't check exact match
            expect(document.activeElement.className).toEqual(input.className);

            // cleanup the appended child
            pluginContainer.remove();
        });

        it("should hide link editor", () => {
            showLinkEditor(view.editorView);
            editor.update(view.editorView);

            hideLinkEditor(view.editorView);
            editor.update(view.editorView);

            expect(editor.viewContainer.parentElement).toBeNull();
        });

        it.todo("should show error when failing required fields validation");

        it.todo("should show error when failing link validation");

        it.todo("should hide error when hiding editor");

        it.todo("should prefill fields when a link is edited");

        it.todo("should show insert new links on save");

        it.todo("should update existing links on save");

        it.todo(
            "should use the url as the link text when the text is not provided"
        );
    });

    // TODO existing tests, rewrite to use helpers used above?
    describe("tooltip", () => {
        it("should not show with no cursor", () => {
            const state = createState(
                `<a href="https://www.example.com">test</a>`,
                [editorPlugin]
            );
            const decorations = getDecorations(state);

            expect(decorations).toEqual(DecorationSet.empty);
        });

        it("should not show with cursor on non-links", () => {
            let state = createState(
                `<p>test<a href="https://www.example.com">link</a></p>`,
                [editorPlugin]
            );
            state = applySelection(state, 0);

            const currentNode = state.doc.nodeAt(state.selection.from);

            const decorations = getDecorations(state);

            expect(currentNode.isText).toBe(true);
            expect(currentNode.text).toBe("test");
            expect(currentNode.marks).toHaveLength(0);

            expect(decorations).toEqual(DecorationSet.empty);
        });

        it("should show with cursor on links", () => {
            let state = createState(
                `<p>test<a href="https://www.example.com">link</a></p>`,
                [editorPlugin]
            );

            state = applySelection(state, 5);

            const currentNode = state.doc.nodeAt(state.selection.from);

            expect(currentNode.isText).toBe(true);
            expect(currentNode.text).toBe("link");
            expect(currentNode.marks).toHaveLength(1);
            expect(currentNode.marks[0].attrs).toHaveProperty("href");

            const decorations = getDecorations(state);
            expect(decorations).not.toEqual(DecorationSet.empty);
        });

        it("should edit on button click", () => {
            const pluginContainer = document.createElement("div");
            const state = applySelection(
                createState(
                    `<p>test<a href="https://www.example.com">link</a></p>`,
                    [
                        interfaceManagerPlugin(() => pluginContainer),
                        linkEditorPlugin({}),
                    ]
                ),
                5
            );
            // we have to create a view so that the decorations are rendered
            const view = createView(state);

            expect(pluginContainer.parentElement).toBeNull();

            // intercept the dispatch
            onViewDispatch(view, () => {
                // this should open the editor interface
                const updatedUploadContainer =
                    view.dom.querySelector(".js-link-editor");
                expect(updatedUploadContainer).toBeTruthy();

                // the decoration should be hidden now
                renderedDeco = getRenderedDecoration(view.state);
                expect(renderedDeco).toBe(DecorationSet.empty);
            });

            // simulate clicking the button
            let renderedDeco = getRenderedDecoration(view.state);
            renderedDeco
                .querySelector<HTMLButtonElement>(".js-link-tooltip-edit")
                .click();
        });

        it("should delete on button click", () => {
            const pluginContainer = document.createElement("div");
            const state = applySelection(
                createState(
                    `<p>test<a href="https://www.example.com">link</a></p>`,
                    [
                        interfaceManagerPlugin(() => pluginContainer),
                        linkEditorPlugin({}),
                    ]
                ),
                5
            );
            // we have to create a view so that the decorations are rendered
            const view = createView(state);

            expect(pluginContainer.parentElement).toBeNull();

            // intercept the dispatch
            onViewDispatch(view, () => {
                // this should open the editor interface

                const currentNode = view.state.doc.nodeAt(
                    view.state.selection.from
                );

                expect(currentNode.isText).toBe(true);
                expect(currentNode.text).toBe("link");
                expect(currentNode.marks).toHaveLength(0);

                // the decoration should be hidden now
                renderedDeco = getRenderedDecoration(view.state);

                expect(renderedDeco).toBe(DecorationSet.empty);
            });

            let renderedDeco = getRenderedDecoration(view.state);
            renderedDeco
                .querySelector<HTMLButtonElement>(".js-link-tooltip-remove")
                .click();
        });
    });
});

// TODO use createView instead and add the plugin in!
function richTextView(
    markdown: string,
    containerFn: () => Element
): RichTextEditor {
    return new RichTextEditor(document.createElement("div"), markdown, {
        pluginParentContainer: containerFn,
    });
}

function onViewDispatch(view: EditorView, callback: (tr: Transaction) => void) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const oldDispatch = view.dispatch;
    const spy = jest.fn(function (...args) {
        callback(args[0]);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return oldDispatch.apply(view, args);
    });
    view.dispatch = spy;

    return spy;
}
