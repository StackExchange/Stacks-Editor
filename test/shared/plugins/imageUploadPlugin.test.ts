import { RichTextEditor } from "../../../src/rich-text/editor";
import {
    ImageUploader,
    showImageUploader,
    hideImageUploader,
} from "../../../src/shared/prosemirror-plugins/image-upload";

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
        const updatedUploadContainer = pluginContainer.querySelector(
            ".js-image-uploader"
        );

        expect(updatedUploadContainer.classList).not.toContain("d-none");
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
                expect(previewImage.title).toEqual("some image");
                expect(findAddButton(uploader).disabled).toBe(false);
                expect(findValidationMessage(uploader).classList).toContain(
                    "d-none"
                );
            });
    });

    it("should show error when uploading wrong filetype", () => {
        showImageUploader(view.editorView);
        uploader.update(view.editorView);

        return uploader
            .showImagePreview(mockFile("some html file", "text/html"))
            .catch((error) => {
                expect(error).toEqual("invalid filetype");
                expect(findPreviewElement(uploader).classList).toContain(
                    "d-none"
                );
                expect(findAddButton(uploader).disabled).toBe(true);
                const validationMessage = findValidationMessage(uploader);
                expect(validationMessage.textContent).toEqual(
                    "Please select an image (jpeg, png, gif) to upload"
                );
                expect(validationMessage.classList).not.toContain("d-none");
            });
    });

    it("should hide error when hiding uploader", () => {
        showImageUploader(view.editorView);
        uploader.update(view.editorView);

        return uploader
            .showImagePreview(mockFile("some html file", "text/html"))
            .catch((error) => {
                expect(error).toEqual("invalid filetype");

                // hide the uploader again
                hideImageUploader(view.editorView);
                uploader.update(view.editorView);

                const validationMessage = findValidationMessage(uploader);
                expect(validationMessage.classList).toContain("d-none");
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
