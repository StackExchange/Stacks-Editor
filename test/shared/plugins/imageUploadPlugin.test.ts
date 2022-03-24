import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { RichTextEditor } from "../../../src/rich-text/editor";
import {
    ImageUploader,
    showImageUploader,
    hideImageUploader,
    commonmarkImageUpload,
    richTextImageUpload,
} from "../../../src/shared/prosemirror-plugins/image-upload";
import { commonmarkSchema, richTextSchema } from "../../../src/shared/schema";
import "../../matchers";
import { getSelectedText } from "../../test-helpers";

let pluginContainer: Element;
let view: RichTextEditor;
let uploader: ImageUploader;

describe("image upload plugin", () => {
    beforeEach(() => {
        pluginContainer = document.createElement("div");
        view = richTextView("", () => pluginContainer);
        uploader = new ImageUploader(
            view.editorView,
            {
                handler: () => Promise.resolve("https://example.com/image.png"),
            },
            pluginContainer,
            (state) => state.tr
        );
    });

    it("should show image uploader", () => {
        expect(uploader.uploadContainer.classList).toContain("d-none");

        showImageUploader(view.editorView);
        uploader.update(view.editorView);
        const updatedUploadContainer =
            pluginContainer.querySelector(".js-image-uploader");

        expect(updatedUploadContainer.classList).not.toContain("d-none");
    });

    it("should focus 'browse' button when showing image uploader", () => {
        // we need to add our DOM to the doc's body in order to make jsdom's "focus" handling work
        // see https://github.com/jsdom/jsdom/issues/2586#issuecomment-742593116
        document.body.appendChild(pluginContainer);

        expect(uploader.uploadContainer.classList).toContain("d-none");

        showImageUploader(view.editorView);
        uploader.update(view.editorView);
        const updatedUploadContainer =
            pluginContainer.querySelector(".js-image-uploader");

        expect(document.activeElement).toEqual(
            updatedUploadContainer.querySelector(".js-browse-button")
        );
    });

    it("should hide image uploader", () => {
        showImageUploader(view.editorView);
        uploader.update(view.editorView);

        hideImageUploader(view.editorView);
        uploader.update(view.editorView);

        expect(uploader.uploadContainer.classList).toContain("d-none");
    });

    it("should disable 'add image' button without preview", () => {
        showImageUploader(view.editorView);
        uploader.update(view.editorView);

        const addButton = findAddButton(uploader);

        expect(addButton.disabled).toBe(true);
    });

    it("should hide file preview when no file is selected", () => {
        showImageUploader(view.editorView);
        uploader.update(view.editorView);

        const previewElement = findPreviewElement(uploader);
        expect(previewElement.classList).toContain("d-none");
    });

    it("should show file preview", async () => {
        const previewElement = findPreviewElement(uploader);
        showImageUploader(view.editorView);
        uploader.update(view.editorView);

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
        uploader.update(view.editorView);

        await expect(
            uploader.showImagePreview(mockFile("some html file", "text/html"))
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
        uploader.update(view.editorView);

        await expect(
            uploader.showImagePreview(mockFile("some html file", "text/html"))
        ).rejects.toBe("invalid filetype");

        // hide the uploader again
        hideImageUploader(view.editorView);
        uploader.update(view.editorView);

        const validationMessage = findValidationMessage(uploader);
        expect(validationMessage.classList).toContain("d-none");
    });

    describe("wrapImagesInLinks", () => {
        it.each([false, true])("rich-text", async (optionSet: boolean) => {
            const plugin = richTextImageUpload(
                {
                    handler: () =>
                        Promise.resolve("https://www.example.com/image"),
                    wrapImagesInLinks: optionSet,
                },
                () => document.createElement("div")
            );

            const view = new EditorView(document.createElement("div"), {
                state: EditorState.create({
                    schema: richTextSchema,
                    plugins: [plugin],
                }),
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
                                    alt: null,
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
                () => document.createElement("div")
            );

            const view = new EditorView(document.createElement("div"), {
                state: EditorState.create({
                    schema: commonmarkSchema,
                    plugins: [plugin],
                }),
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

function mockFile(filename: string, type: string): File {
    return new File([""], filename, { type: type });
}

function richTextView(
    markdown: string,
    containerFn: () => Element
): RichTextEditor {
    return new RichTextEditor(document.createElement("div"), markdown, {
        pluginParentContainer: containerFn,
    });
}
