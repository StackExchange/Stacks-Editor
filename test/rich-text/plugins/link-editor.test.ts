import { EditorState, Transaction } from "prosemirror-state";
import { DecorationSet, EditorView } from "prosemirror-view";
import { RichTextEditor } from "../../../src/rich-text/editor";
import {
    hideLinkEditor,
    LinkEditor,
    linkEditorPlugin,
    showLinkEditor,
} from "../../../src/rich-text/plugins/link-editor";
import { stackOverflowValidateLink } from "../../../src/shared/utils";
import {
    applySelection,
    cleanupPasteSupport,
    createState,
    createView,
    setupPasteSupport,
} from "../test-helpers";
import "../../matchers";
import { interfaceManagerPlugin } from "../../../src/shared/prosemirror-plugins/interface-manager";
import { externalPluginProvider } from "../../test-helpers";

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

function getRenderedDecoration(editorView: EditorView): HTMLElement {
    const state = editorView.state;
    const decorations = getDecorations(state);
    const decoration = decorations.find(state.selection.from)[0];
    expect(decoration).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pState = state.plugins[0].getState(state);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Oh snap, we're going off the grid!
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const renderer = decoration["type"].toDOM.bind(pState.linkTooltip) as (
        view: EditorView
    ) => HTMLElement;

    const view = editorView;

    return renderer(view);
}

describe("link-editor", () => {
    describe("plugin view", () => {
        let pluginContainer: Element;
        let menuContainer: Element;
        let view: RichTextEditor;
        let editor: LinkEditor;

        beforeEach(() => {
            pluginContainer = document.createElement("div");
            menuContainer = document.createElement("div");
            view = richTextView(
                "",
                () => pluginContainer,
                () => menuContainer
            );
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

        it("should show error when failing link validation", () => {
            expect(editor.viewContainer.parentElement).toBeNull();

            showLinkEditor(view.editorView);
            editor.update(view.editorView);
            const updatedUploadContainer =
                pluginContainer.querySelector<HTMLFormElement>(
                    "form.js-link-editor"
                );

            // submit the form without filling in any inputs
            updatedUploadContainer.submit();

            const inputContainer = updatedUploadContainer.querySelector(
                ".js-link-editor-href"
            ).parentElement;

            expect(inputContainer.classList).toContain("has-error");
        });

        it("should hide error when hiding editor", () => {
            expect(editor.viewContainer.parentElement).toBeNull();

            showLinkEditor(view.editorView);
            editor.update(view.editorView);
            const updatedUploadContainer =
                pluginContainer.querySelector<HTMLFormElement>(
                    "form.js-link-editor"
                );

            // submit the form without filling in any inputs
            updatedUploadContainer.submit();

            let inputContainer = updatedUploadContainer.querySelector(
                ".js-link-editor-href"
            ).parentElement;

            expect(inputContainer.classList).toContain("has-error");

            hideLinkEditor(view.editorView);
            editor.update(view.editorView);

            showLinkEditor(view.editorView);
            editor.update(view.editorView);

            inputContainer = pluginContainer.querySelector(
                ".js-link-editor-href"
            ).parentElement;

            expect(inputContainer.classList).not.toContain("has-error");
        });

        it("should prefill fields when a link is edited via the tooltip", () => {
            view = richTextView(
                "[link text](https://www.example.com)",
                () => pluginContainer
            );

            view.editorView.updateState(
                applySelection(view.editorView.state, 1)
            );

            const promise = onViewDispatch(view.editorView, (_, tr) => {
                if (!tr || !tr.getMeta("LinkEditor$")) {
                    return false;
                }

                const updatedUploadContainer =
                    pluginContainer.querySelector<HTMLFormElement>(
                        "form.js-link-editor"
                    );

                expect(formValue(updatedUploadContainer, "href")).toBe(
                    "https://www.example.com"
                );
                expect(formValue(updatedUploadContainer, "text")).toBe(
                    "link text"
                );

                return true;
            });

            // simulate clicking the button
            const renderedDeco = getRenderedDecoration(view.editorView);
            renderedDeco
                .querySelector<HTMLButtonElement>(".js-link-tooltip-edit")
                .dispatchEvent(new Event("mousedown"));

            return promise;
        });

        it("should prefill fields when a link is edited via the menu command", () => {
            view = richTextView(
                "[link text](https://www.example.com)",
                () => pluginContainer,
                () => menuContainer
            );

            const promise = onViewDispatch(view.editorView, (_, tr) => {
                if (!tr || !tr.getMeta("LinkEditor$")) {
                    return false;
                }

                const updatedUploadContainer =
                    pluginContainer.querySelector<HTMLFormElement>(
                        "form.js-link-editor"
                    );

                expect(formValue(updatedUploadContainer, "href")).toBe(
                    "https://www.example.com"
                );
                expect(formValue(updatedUploadContainer, "text")).toBe(
                    "link text"
                );

                return true;
            });

            view.editorView.updateState(
                applySelection(view.editorView.state, 1)
            );

            menuContainer
                .querySelector<HTMLButtonElement>(".js-insert-link-btn")
                .click();

            return promise;
        });

        it("should prefill fields when a link is inserted over selected text via the menu command", () => {
            view = richTextView(
                "test",
                () => pluginContainer,
                () => menuContainer
            );

            view.editorView.updateState(
                applySelection(view.editorView.state, 0, 4)
            );

            const promise = onViewDispatch(view.editorView, (_, tr) => {
                if (!tr || !tr.getMeta("LinkEditor$")) {
                    return false;
                }

                const updatedUploadContainer =
                    pluginContainer.querySelector<HTMLFormElement>(
                        "form.js-link-editor"
                    );

                expect(formValue(updatedUploadContainer, "href")).toBe("");
                expect(formValue(updatedUploadContainer, "text")).toBe("test");

                return true;
            });

            menuContainer
                .querySelector<HTMLButtonElement>(".js-insert-link-btn")
                .click();

            return promise;
        });

        it("should show insert new links on save", () => {
            view.editorView.updateState(
                applySelection(view.editorView.state, 0)
            );

            const promise = onViewDispatch(view.editorView, (newView, tr) => {
                if (!tr) {
                    return false;
                }

                const meta = tr.getMeta("LinkEditor$") as {
                    shouldShow: boolean;
                };

                // editor is shown
                if (meta && meta.shouldShow) {
                    const updatedUploadContainer =
                        pluginContainer.querySelector<HTMLFormElement>(
                            "form.js-link-editor"
                        );

                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(formValue(updatedUploadContainer, "href")).toBe("");
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(formValue(updatedUploadContainer, "text")).toBe("");

                    // set the values, then submit the form
                    setFormValue(
                        updatedUploadContainer,
                        "href",
                        "https://www.example.com"
                    );
                    setFormValue(updatedUploadContainer, "text", "link text");
                    updatedUploadContainer.submit();

                    return false;
                } else if (meta && !meta.shouldShow) {
                    // editor is hidden (save was called)
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(newView.state.doc).toMatchNodeTree({
                        content: [
                            {
                                content: [
                                    {
                                        "isText": true,
                                        "text": "link text",
                                        "marks.0.type.name": "link",
                                        "marks.0.attrs.href":
                                            "https://www.example.com",
                                    },
                                ],
                            },
                        ],
                    });
                    // TODO assert text selection

                    return true;
                }

                return false;
            });

            menuContainer
                .querySelector<HTMLButtonElement>(".js-insert-link-btn")
                .click();

            return promise;
        });

        it.todo("should update existing links on save");

        it.todo(
            "should use the url as the link text when the text is not provided"
        );

        it.todo("should hide the tooltip when opened");
        it.todo("should show the tooltip when closed");
        it.todo("should manipulate the cursor position on save");
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
                        linkEditorPlugin({
                            validateLink: () => true,
                        }),
                    ]
                ),
                5
            );
            // we have to create a view so that the decorations are rendered
            const view = createView(state);

            expect(pluginContainer.parentElement).toBeNull();

            // intercept the dispatch
            const promise = onViewDispatch(view, (newView, tr) => {
                if (!tr || !tr.getMeta("LinkEditor$")) {
                    return false;
                }

                // this should open the editor interface
                const updatedUploadContainer =
                    pluginContainer.querySelector(".js-link-editor");
                expect(updatedUploadContainer).toBeTruthy();

                // the decoration should be hidden now
                const decos = getDecorations(newView.state);
                expect(decos).toBe(DecorationSet.empty);

                return true;
            });

            // simulate clicking the button
            const renderedDeco = getRenderedDecoration(view);
            renderedDeco
                .querySelector<HTMLButtonElement>(".js-link-tooltip-edit")
                .dispatchEvent(new Event("mousedown"));

            return promise;
        });

        it("should delete on button click", () => {
            setupPasteSupport();
            const pluginContainer = document.createElement("div");
            const state = applySelection(
                createState(
                    `<p>test<a href="https://www.example.com">link</a></p>`,
                    [
                        interfaceManagerPlugin(() => pluginContainer),
                        linkEditorPlugin({}),
                    ]
                ),
                6
            );

            // we have to create a view so that the decorations are rendered
            const view = createView(state);

            const promise = onViewDispatch(view, (newView, tr) => {
                if (!tr) {
                    return false;
                }

                const currentNode = newView.state.doc.nodeAt(
                    newView.state.selection.from
                );

                expect(currentNode.isText).toBe(true);
                expect(currentNode.text).toBe("testlink");
                expect(currentNode.marks).toHaveLength(0);

                // the decoration should be hidden now
                const decos = getDecorations(newView.state);

                expect(decos).toBe(DecorationSet.empty);

                return true;
            });

            expect(pluginContainer.parentElement).toBeNull();

            const renderedDeco = getRenderedDecoration(view);
            renderedDeco
                .querySelector<HTMLButtonElement>(".js-link-tooltip-remove")
                .dispatchEvent(new Event("mousedown"));

            return promise.then(() => cleanupPasteSupport());
        });
    });
});

// TODO use createView instead and add the plugin in!
function richTextView(
    markdown: string,
    pluginContainerFn: () => Element,
    menuContainerFn?: () => Element
): RichTextEditor {
    return new RichTextEditor(
        document.createElement("div"),
        markdown,
        externalPluginProvider(),
        {
            pluginParentContainer: pluginContainerFn,
            menuParentContainer: menuContainerFn,
        }
    );
}

// TODO DOCUMENT
function onViewDispatch(
    view: EditorView,
    callback: (newView: EditorView, tr: Transaction) => boolean
) {
    return new Promise<void>((resolve, reject) => {
        view.setProps({
            dispatchTransaction(this: EditorView, tr) {
                try {
                    const newState = this.state.apply(tr);
                    this.updateState(newState);
                    if (callback(this, tr)) {
                        resolve();
                    }
                } catch (e) {
                    reject(e);
                }
            },
        });
    });
}

function formValue(form: HTMLFormElement, name: string) {
    return form.querySelector<HTMLInputElement>(`[name="${name}"]`).value;
}

function setFormValue(form: HTMLFormElement, name: string, value: string) {
    return (form.querySelector<HTMLInputElement>(`[name="${name}"]`).value =
        value);
}
