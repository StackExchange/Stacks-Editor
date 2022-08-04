import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { RichTextEditor } from "../../../src/rich-text/editor";
import {
    ImageUploader,
    showImageUploader,
    hideImageUploader,
    commonmarkImageUpload,
    richTextImageUpload,
    imageUploaderEnabled,
} from "../../../src/shared/prosemirror-plugins/image-upload";
import {
    externalPluginProvider,
    getPluginStateByName,
    getPluginViewInstance,
    getSelectedText,
} from "../../test-helpers";
import { commonmarkSchema } from "../../../src/commonmark/schema";
import { stackOverflowValidateLink } from "../../../src/shared/utils";
import {
    cleanupDropSupport,
    cleanupPasteSupport,
    dispatchDropEvent,
    dispatchPasteEvent,
    setupDropSupport,
    setupPasteSupport,
    testRichTextSchema,
} from "../../rich-text/test-helpers";

let pluginContainer: Element;
let view: RichTextEditor;
let uploader: ImageUploader;

describe("image upload plugin", () => {
    describe("plugin view", () => {
        beforeEach(setupTestVariables);

        it("should show image uploader", () => {
            expect(uploader.uploadContainer.parentElement).toBeNull();

            showImageUploader(view.editorView);
            const updatedUploadContainer =
                pluginContainer.querySelector(".js-image-uploader");

            expect(updatedUploadContainer.parentElement).toBeTruthy();
        });

        it("should focus 'browse' button when showing image uploader", () => {
            // we need to add our DOM to the doc's body in order to make jsdom's "focus" handling work
            // see https://github.com/jsdom/jsdom/issues/2586#issuecomment-742593116
            document.body.appendChild(pluginContainer);

            expect(uploader.uploadContainer.parentElement).toBeNull();

            showImageUploader(view.editorView);
            const updatedUploadContainer =
                pluginContainer.querySelector(".js-image-uploader");

            const fileInput = updatedUploadContainer.querySelector(
                ".js-browse-button input"
            );
            // the actual element changes when the plugin state is updated, so we can't check exact match
            expect(document.activeElement.className).toEqual(
                fileInput.className
            );

            // cleanup the appended child
            pluginContainer.remove();
        });

        it("should hide image uploader", () => {
            showImageUploader(view.editorView);

            hideImageUploader(view.editorView);

            expect(uploader.uploadContainer.parentElement).toBeNull();
        });

        it("should disable 'add image' button without preview", () => {
            showImageUploader(view.editorView);

            const addButton = findAddButton(uploader);

            expect(addButton.disabled).toBe(true);
        });

        it("should hide file preview when no file is selected", () => {
            showImageUploader(view.editorView);

            const previewElement = findPreviewElement(uploader);
            expect(previewElement.classList).toContain("d-none");
        });

        it("should show file preview", async () => {
            const previewElement = findPreviewElement(uploader);
            showImageUploader(view.editorView);

            return uploader
                .showImagePreview(mockFile("some image", "image/png"))
                .then(() => {
                    const previewImage = previewElement.querySelector("img");
                    expect(previewElement.classList).not.toContain("d-none");
                    expect(previewImage.title).toBe("some image");
                    expect(findAddButton(uploader).disabled).toBe(false);
                    expect(findValidationMessage(uploader).classList).toContain(
                        "d-none"
                    );
                });
        });

        it("should show error when uploading wrong filetype", async () => {
            showImageUploader(view.editorView);

            await expect(
                uploader.showImagePreview(
                    mockFile("some html file", "text/html")
                )
            ).rejects.toBe("invalid filetype");
            expect(findPreviewElement(uploader).classList).toContain("d-none");
            expect(findAddButton(uploader).disabled).toBe(true);
            const validationMessage = findValidationMessage(uploader);
            expect(validationMessage.textContent).toBe(
                "Please select an image (jpeg, png, gif) to upload"
            );
            expect(validationMessage.classList).not.toContain("d-none");
        });

        it("should hide error when hiding uploader", async () => {
            showImageUploader(view.editorView);

            await expect(
                uploader.showImagePreview(
                    mockFile("some html file", "text/html")
                )
            ).rejects.toBe("invalid filetype");

            // hide the uploader again
            hideImageUploader(view.editorView);

            const validationMessage = findValidationMessage(uploader);
            expect(validationMessage.classList).toContain("d-none");
        });

        it("should not show `enter link` prompt when allowExternalUrls is disabled", () => {
            showImageUploader(view.editorView);
            const updatedUploadContainer = pluginContainer.querySelector(
                ".js-external-url-trigger-container"
            );

            expect(updatedUploadContainer.classList).toContain("d-none");
        });

        it("should handleDrop on editor", () => {
            setupDropSupport(view.editorView.dom);

            let state = getPluginStateByName<{ file: File }>(
                view.editorView.state,
                "image-uploader"
            );

            expect(state.file).toBeFalsy();

            dispatchDropEvent(
                view.editorView.dom,
                mockFile("some image", "image/png")
            );

            state = getPluginStateByName<{ file: File }>(
                view.editorView.state,
                "image-uploader"
            );

            expect(state.file).toBeTruthy();

            cleanupDropSupport();
        });

        it("should handlePaste on editor", () => {
            setupPasteSupport();

            let state = getPluginStateByName<{ file: File }>(
                view.editorView.state,
                "image-uploader"
            );

            expect(state.file).toBeFalsy();

            dispatchPasteEvent(
                view.editorView.dom,
                null,
                mockFile("some image", "image/png")
            );

            state = getPluginStateByName<{ file: File }>(
                view.editorView.state,
                "image-uploader"
            );

            expect(state.file).toBeTruthy();

            cleanupPasteSupport();
        });

        it.todo("should handleDrop on pane");
        it.todo("should handlePaste on pane");
    });

    describe("wrapImagesInLinks", () => {
        it.each([false, true])("rich-text", async (optionSet: boolean) => {
            const plugin = richTextImageUpload(
                {
                    handler: () =>
                        Promise.resolve("https://www.example.com/image"),
                    wrapImagesInLinks: optionSet,
                },
                stackOverflowValidateLink,
                testRichTextSchema
            );

            const view = new EditorView(document.createElement("div"), {
                state: EditorState.create({
                    schema: testRichTextSchema,
                    plugins: [plugin],
                }),
                plugins: [],
            });

            const imageUploader = plugin.spec.view(view) as ImageUploader;
            await imageUploader.startImageUpload(
                view,
                mockFile("some image", "image/png")
            );

            expect(view.state.doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "paragraph",
                        "childCount": 1,
                        "content": [
                            {
                                "type.name": "image",
                                "attrs": {
                                    alt: "enter image description here",
                                    height: null,
                                    markup: "",
                                    src: "https://www.example.com/image",
                                    title: null,
                                    width: null,
                                },
                                ...(optionSet
                                    ? {
                                          "marks.length": 1,
                                          "marks.0.type.name": "link",
                                          "marks.0.attrs.href":
                                              "https://www.example.com/image",
                                      }
                                    : {}),
                            },
                        ],
                    },
                ],
            });
        });

        it.each([
            [
                false,
                "![enter image description here](https://www.example.com/image)",
            ],
            [
                true,
                "[![enter image description here](https://www.example.com/image)](https://www.example.com/image)",
            ],
        ])("commonmark", async (optionSet: boolean, expectedText: string) => {
            const plugin = commonmarkImageUpload(
                {
                    handler: () =>
                        Promise.resolve("https://www.example.com/image"),
                    wrapImagesInLinks: optionSet,
                },
                stackOverflowValidateLink
            );

            const view = new EditorView(document.createElement("div"), {
                state: EditorState.create({
                    schema: commonmarkSchema,
                    plugins: [plugin],
                }),
                plugins: [],
            });

            const imageUploader = plugin.spec.view(view) as ImageUploader;
            await imageUploader.startImageUpload(
                view,
                mockFile("some image", "image/png")
            );

            expect(view.state.doc.textContent).toBe(expectedText);

            expect(getSelectedText(view.state)).toBe(
                "enter image description here"
            );
        });
    });

    describe("embedImagesAsLinks", () => {
        it.each([false, true])("rich-text", async (optionSet: boolean) => {
            const plugin = richTextImageUpload(
                {
                    handler: () =>
                        Promise.resolve("https://www.example.com/image"),
                    embedImagesAsLinks: optionSet,
                },
                stackOverflowValidateLink,
                testRichTextSchema
            );

            const view = new EditorView(document.createElement("div"), {
                state: EditorState.create({
                    schema: testRichTextSchema,
                    plugins: [plugin],
                }),
                plugins: [],
            });

            const imageUploader = plugin.spec.view(view) as ImageUploader;
            await imageUploader.startImageUpload(
                view,
                mockFile("some image", "image/png")
            );

            expect(view.state.doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "paragraph",
                        "childCount": 1,
                        "content": [
                            {
                                "type.name": optionSet ? "text" : "image",
                                ...(optionSet
                                    ? {
                                          "marks.length": 1,
                                          "marks.0.type.name": "link",
                                          "marks.0.attrs.href":
                                              "https://www.example.com/image",
                                      }
                                    : {
                                          attrs: {
                                              alt: "enter image description here",
                                              height: null,
                                              markup: "",
                                              src: "https://www.example.com/image",
                                              title: null,
                                              width: null,
                                          },
                                      }),
                            },
                        ],
                    },
                ],
            });
        });

        it.each([
            [
                false,
                "![enter image description here](https://www.example.com/image)",
            ],
            [
                true,
                "[enter image description here](https://www.example.com/image)",
            ],
        ])("commonmark", async (optionSet: boolean, expectedText: string) => {
            const plugin = commonmarkImageUpload(
                {
                    handler: () =>
                        Promise.resolve("https://www.example.com/image"),
                    embedImagesAsLinks: optionSet,
                },
                stackOverflowValidateLink
            );

            const view = new EditorView(document.createElement("div"), {
                state: EditorState.create({
                    schema: commonmarkSchema,
                    plugins: [plugin],
                }),
                plugins: [],
            });

            const imageUploader = plugin.spec.view(view) as ImageUploader;
            await imageUploader.startImageUpload(
                view,
                mockFile("some image", "image/png")
            );

            expect(view.state.doc.textContent).toBe(expectedText);

            expect(getSelectedText(view.state)).toBe(
                "enter image description here"
            );
        });
    });

    describe("allowExternalUrls", () => {
        it("rich-text", async () => {
            const plugin = richTextImageUpload(
                {
                    handler: (file: File | string) => {
                        expect(typeof file).toBe("string");
                        return Promise.resolve(file as string);
                    },
                    allowExternalUrls: true,
                },
                stackOverflowValidateLink,
                testRichTextSchema
            );

            const view = new EditorView(document.createElement("div"), {
                state: EditorState.create({
                    schema: testRichTextSchema,
                    plugins: [plugin],
                }),
                plugins: [],
            });

            const imageUploader = plugin.spec.view(view) as ImageUploader;
            await imageUploader.startImageUpload(
                view,
                "https://www.external-example.com/image"
            );

            expect(view.state.doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "paragraph",
                        "childCount": 1,
                        "content": [
                            {
                                "type.name": "image",
                                "attrs": {
                                    alt: "enter image description here",
                                    height: null,
                                    markup: "",
                                    src: "https://www.external-example.com/image",
                                    title: null,
                                    width: null,
                                },
                            },
                        ],
                    },
                ],
            });
        });

        it("commonmark", async () => {
            const plugin = commonmarkImageUpload(
                {
                    handler: (file: File | string) => {
                        expect(typeof file).toBe("string");
                        return Promise.resolve(file as string);
                    },
                    allowExternalUrls: true,
                },
                stackOverflowValidateLink
            );

            const view = new EditorView(document.createElement("div"), {
                state: EditorState.create({
                    schema: commonmarkSchema,
                    plugins: [plugin],
                }),
                plugins: [],
            });

            const imageUploader = plugin.spec.view(view) as ImageUploader;
            await imageUploader.startImageUpload(
                view,
                "https://www.external-example.com/image"
            );

            expect(view.state.doc.textContent).toBe(
                "![enter image description here](https://www.external-example.com/image)"
            );

            expect(getSelectedText(view.state)).toBe(
                "enter image description here"
            );
        });

        describe("plugin view", () => {
            beforeEach(() => {
                pluginContainer = document.createElement("div");
                view = richTextView("", () => pluginContainer);
                uploader = new ImageUploader(
                    view.editorView,
                    {
                        handler: (file: File | string) => {
                            expect(typeof file).toBe("string");
                            return Promise.resolve(file as string);
                        },
                        allowExternalUrls: true,
                    },
                    stackOverflowValidateLink,
                    (state) => state.tr
                );
            });

            it("should toggle `enter link` prompt visibility", () => {
                showImageUploader(view.editorView);
                const updatedUploadContainer =
                    pluginContainer.querySelector(".js-image-uploader");

                expect(updatedUploadContainer.classList).not.toContain(
                    "d-none"
                );
            });

            // TODO test fails due to DOM not updating
            it.skip("should show url input when prompt is clicked", () => {
                showImageUploader(view.editorView);
                const inputContainer = pluginContainer.querySelector(
                    ".js-external-url-input-container"
                );
                const trigger = pluginContainer.querySelector<HTMLElement>(
                    ".js-external-url-trigger"
                );

                expect(trigger.classList).not.toContain("d-none");
                expect(inputContainer.classList).toContain("d-none");

                // TODO this isn't updating pluginContainer, so the test fails
                trigger.dispatchEvent(new Event("click"));

                // the cta container should hide and the input container should show
                expect(
                    pluginContainer.querySelector(".js-cta-container").classList
                ).toContain("d-none");
                expect(inputContainer.classList).not.toContain("d-none");
            });

            it.todo("should enable upload button when a valid url is entered");
            it.todo(
                "should disable upload button and show an error when an invalid url is entered"
            );
            it.todo("should clear the input when the uploader is closed");
        });
    });

    describe("helpers", () => {
        beforeEach(setupTestVariables);
        it.skip("should prefill when showImageUploader is passed file data", () => {
            expect(uploader.uploadContainer.parentElement).toBeNull();

            showImageUploader(
                view.editorView,
                mockFile("some image", "image/png")
            );

            const pluginState = getPluginStateByName<{ file: File | null }>(
                view.editorView.state,
                "image-uploader"
            );

            expect(pluginState.file).toBeTruthy();

            const updatedUploadContainer =
                pluginContainer.querySelector(".js-image-uploader");

            expect(updatedUploadContainer.parentElement).toBeTruthy();
            expect(findPreviewElement(uploader)).not.toContain("d-none");
        });

        it("should clear the state when hideImageUploader is called", () => {
            expect(uploader.uploadContainer.parentElement).toBeNull();

            // first, show the uploader with a file set
            showImageUploader(
                view.editorView,
                mockFile("some image", "image/png")
            );

            let pluginState = getPluginStateByName<{ file: File | null }>(
                view.editorView.state,
                "image-uploader"
            );

            expect(pluginState.file).toBeTruthy();

            // then, hide the uploader
            hideImageUploader(view.editorView);

            pluginState = getPluginStateByName<{ file: File | null }>(
                view.editorView.state,
                "image-uploader"
            );

            expect(pluginState.file).toBeFalsy();
        });
        it("should return the correct value when imageUploaderEnabled is called", () => {
            // test enabled state
            let state = EditorState.create({
                schema: testRichTextSchema,
                plugins: [
                    richTextImageUpload(
                        {
                            handler: () => null,
                        },
                        null,
                        testRichTextSchema
                    ),
                ],
            });

            expect(imageUploaderEnabled(state)).toBe(true);

            // test disabled state
            state = EditorState.create({
                schema: testRichTextSchema,
                plugins: [richTextImageUpload({}, null, testRichTextSchema)],
            });

            expect(imageUploaderEnabled(state)).toBe(false);
        });
    });

    function findPreviewElement(uploader: ImageUploader): HTMLElement {
        return uploader.uploadContainer.querySelector(".js-image-preview");
    }

    function findAddButton(uploader: ImageUploader): HTMLButtonElement {
        return uploader.uploadContainer.querySelector(".js-add-image");
    }

    function findValidationMessage(uploader: ImageUploader): HTMLElement {
        return uploader.uploadContainer.querySelector(".js-validation-message");
    }
});

function setupTestVariables() {
    pluginContainer = document.createElement("div");
    view = richTextView("", () => pluginContainer);
    uploader = getPluginViewInstance(view.editorView, ImageUploader);
}

function mockFile(filename: string, type: string): File {
    return new File([""], filename, { type: type });
}

function richTextView(
    markdown: string,
    containerFn: () => Element
): RichTextEditor {
    return new RichTextEditor(
        document.createElement("div"),
        markdown,
        externalPluginProvider(),
        {
            pluginParentContainer: containerFn,
        }
    );
}
