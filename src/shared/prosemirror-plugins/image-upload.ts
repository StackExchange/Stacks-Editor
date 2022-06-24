import {
    Plugin,
    EditorState,
    Transaction,
    TextSelection,
    PluginView,
} from "prosemirror-state";
import { NodeSpec, Schema } from "prosemirror-model";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { CommonmarkParserFeatures } from "../view";
import { StatefulPlugin } from "./plugin-extensions";
import { escapeHTML, generateRandomId } from "../utils";
import { _t } from "../localization";
import { ManagedInterfaceKey, PluginInterfaceView } from "./interface-manager";

/**
 * Async image upload callback that is passed the uploaded file and retuns a resolvable path to the image
 * @param {File} file The uploaded image file or user entered image url
 * @returns {string} The resolvable path to where the file was uploaded
 */
type ImageUploadHandlerCallback = (file: File | string) => Promise<string>;

/**
 * Image upload options
 */
export interface ImageUploadOptions {
    /**
     * A function handling file uploads. Will receive the file to upload
     * as the `file` parameter and needs to return a resolved promise with the URL of the uploaded file
     */
    handler?: ImageUploadHandlerCallback;
    /**
     * The html to insert into the image uploader to designate the image storage provider
     * NOTE: this is injected as-is and can potentially be a XSS hazard!
     */
    brandingHtml?: string;
    /**
     * The html to insert into the image uploader to alert users of the uploaded image content policy
     * NOTE: this is injected as-is and can potentially be a XSS hazard!
     */
    contentPolicyHtml?: string;
    /**
     * If true, wraps all images in links that point to the uploaded image url
     */
    wrapImagesInLinks?: boolean;
    /**
     * If true, all uploaded images will embedded as links to the image, rather than the image itself
     * NOTE: this is only supported for images that are uploaded via the image uploader
     */
    embedImagesAsLinks?: boolean;
    /**
     * If true, allow users to add images via an external url
     */
    allowExternalUrls?: boolean;
}

/**
 * Default image upload callback that posts to `/image/upload`,
 * expecting a json response like `{ UploadedImage: "https://www.example.com/path/to/file" }`
 * and returns `UploadedImage`'s value
 * @param file The file to upload
 */
export async function defaultImageUploadHandler(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/image/upload", {
        method: "POST",
        cache: "no-cache",
        body: formData,
    });

    if (!response.ok) {
        throw Error(
            `Failed to upload image: ${response.status} - ${response.statusText}`
        );
    }

    const json = (await response.json()) as { UploadedImage: string };
    return json.UploadedImage;
}

enum ValidationResult {
    Ok,
    FileTooLarge,
    InvalidFileType,
}

/**
 * Callback function to generate a transaction for the ImageUploader
 * to dispatch when an image has been uploaded
 * @param state The current state of the plugin
 * @param url The url to where the image was uploaded
 * @param position The position in the document where any added entities should be inserted
 */
type addTransactionDispatcher = (
    state: EditorState,
    url: string,
    position: number
) => Transaction;

export class ImageUploader extends PluginInterfaceView<
    ImageUploadState,
    typeof INTERFACE_KEY
> {
    uploadOptions?: ImageUploadOptions;
    uploadContainer: HTMLElement;
    uploadField: HTMLInputElement;
    image: File = null;
    isVisible: boolean;
    // TODO do external image urls need to support a different link validator?
    private validateLink: CommonmarkParserFeatures["validateLink"];
    private addTransactionDispatcher: addTransactionDispatcher;

    constructor(
        view: EditorView,
        uploadOptions: ImageUploadOptions,
        validateLink: CommonmarkParserFeatures["validateLink"],
        addTransactionDispatcher: addTransactionDispatcher
    ) {
        super(INTERFACE_KEY);

        const randomId = generateRandomId();
        this.isVisible = false;
        this.uploadOptions = uploadOptions;
        this.validateLink = validateLink;
        this.addTransactionDispatcher = addTransactionDispatcher;

        this.uploadContainer = document.createElement("div");
        this.uploadContainer.className =
            "mt6 bt bb bc-black-400 js-image-uploader";

        this.uploadField = document.createElement("input");
        this.uploadField.type = "file";
        this.uploadField.className = "js-image-uploader-input v-visible-sr";
        this.uploadField.accept = "image/*";
        this.uploadField.multiple = false;
        this.uploadField.id = "fileUpload" + randomId;

        // TODO i18n
        this.uploadContainer.innerHTML = escapeHTML`
            <div class="fs-body2 p12 pb0 js-cta-container">
                <label for="${this.uploadField.id}" class="d-inline-flex f:outline-ring s-link js-browse-button" role="button" aria-controls="image-preview-${randomId}">
                    Browse
                </label>, drag & drop<span class="js-external-url-trigger-container d-none">, <button type="button" class="s-btn s-btn__link js-external-url-trigger">enter a link</button></span>, or paste an image <span class="fc-light fs-caption">Max size 2 MiB</span>
            </div>

            <div class="js-external-url-input-container p12 d-none">
                <div class="d-flex fd-row sm:fd-column ai-center">
                    <label class="d-block s-label ws-nowrap mr4" for="external-url-input-${randomId}">
                        External url
                    </label>
                    <input id="external-url-input-${randomId}" type="text" class="s-input js-external-url-input" placeholder="https://example.com/img.png" />
                </div>
            </div>

            <div id="image-preview-${randomId}" class="js-image-preview wmx100 pt12 px12 d-none"></div>
            <aside class="s-notice s-notice__warning d-none m8 js-validation-message" role="status" aria-hidden="true"></aside>

            <div class="d-flex ai-center p12">
                <button class="s-btn s-btn__primary ws-nowrap mr8 js-add-image" type="button" disabled>Add image</button>
                <button class="s-btn ws-nowrap js-cancel-button" type="button">Cancel</button>
                <div class="ml64 d-flex fd-column fs-caption fc-black-300 s-anchors s-anchors__muted">
                    <div class="js-branding-html"></div>
                    <div class="js-content-policy-html"></div>
                </div>
            </div>
        `;

        // add in the uploadField right after the first child element
        this.uploadContainer
            .querySelector(`.js-browse-button`)
            .appendChild(this.uploadField);

        // XSS "safe": this html is passed in via the editor options; it is not our job to sanitize it
        // eslint-disable-next-line no-unsanitized/property
        this.uploadContainer.querySelector(".js-branding-html").innerHTML =
            this.uploadOptions?.brandingHtml;

        // XSS "safe": this html is passed in via the editor options; it is not our job to sanitize it
        // eslint-disable-next-line no-unsanitized/property
        this.uploadContainer.querySelector(
            ".js-content-policy-html"
        ).innerHTML = this.uploadOptions?.contentPolicyHtml;

        this.uploadField.addEventListener("change", () => {
            this.handleFileSelection(view);
        });

        this.uploadContainer.addEventListener(
            "dragenter",
            this.highlightDropArea.bind(this)
        );

        this.uploadContainer.addEventListener(
            "dragover",
            this.highlightDropArea.bind(this)
        );

        // we need this handler on top of the plugin's handleDrop() to make
        // sure we're handling drop events on the upload container itself properly
        this.uploadContainer.addEventListener("drop", (event: DragEvent) => {
            this.unhighlightDropArea(event);
            this.handleDrop(event, view);
        });

        // we need this handler on top of the plugin's handlePaste() to make
        // sure we're handling paste events on the upload container itself properly
        this.uploadContainer.addEventListener(
            "paste",
            (event: ClipboardEvent) => {
                this.handlePaste(event, view);
            }
        );

        this.uploadContainer.addEventListener(
            "dragleave",
            this.unhighlightDropArea.bind(this)
        );

        this.uploadContainer
            .querySelector(".js-cancel-button")
            .addEventListener("click", () => {
                const tr = this.tryHideInterfaceTr(view.state);
                if (tr) {
                    view.dispatch(tr);
                }
            });

        this.uploadContainer
            .querySelector(".js-add-image")
            .addEventListener("click", (e: Event) =>
                this.handleUploadTrigger(e, this.image, view)
            );

        if (this.uploadOptions.allowExternalUrls) {
            this.uploadContainer
                .querySelector(".js-external-url-trigger-container")
                .classList.remove("d-none");
            this.uploadContainer
                .querySelector(".js-external-url-trigger")
                .addEventListener("click", () => {
                    this.toggleExternalUrlInput(true);
                });

            this.uploadContainer
                .querySelector(".js-external-url-input")
                .addEventListener("input", (e) => {
                    this.validateExternalUrl(
                        (e.target as HTMLInputElement).value
                    );
                });
        }
    }

    highlightDropArea(event: DragEvent): void {
        this.uploadContainer.classList.add("bs-ring");
        this.uploadContainer.classList.add("bc-blue-300");
        event.preventDefault();
        event.stopPropagation();
    }

    unhighlightDropArea(event: DragEvent): void {
        this.uploadContainer.classList.remove("bs-ring");
        this.uploadContainer.classList.remove("bc-blue-300");
        event.preventDefault();
        event.stopPropagation();
    }

    handleFileSelection(view: EditorView): void {
        this.resetImagePreview();
        const files = this.uploadField.files;
        if (view.state.selection.$from.parent.inlineContent && files.length) {
            void this.showImagePreview(files[0]);
        }
    }

    handleDrop(event: DragEvent, view: EditorView): void {
        this.resetImagePreview();
        const files = event.dataTransfer.files;
        if (view.state.selection.$from.parent.inlineContent && files.length) {
            void this.showImagePreview(files[0]);
        }
    }

    handlePaste(event: ClipboardEvent, view: EditorView): void {
        this.resetImagePreview();
        const files = event.clipboardData.files;
        if (view.state.selection.$from.parent.inlineContent && files.length) {
            void this.showImagePreview(files[0]);
        }
    }

    validateImage(image: File): ValidationResult {
        const validTypes = ["image/jpeg", "image/png", "image/gif"];
        const sizeLimit = 0x200000; // 2 MiB

        if (validTypes.indexOf(image.type) === -1) {
            return ValidationResult.InvalidFileType;
        }

        if (image.size >= sizeLimit) {
            return ValidationResult.FileTooLarge;
        }

        return ValidationResult.Ok;
    }

    showValidationError(errorMessage: string, level = "warning"): void {
        this.uploadField.value = null;
        const validationElement = this.uploadContainer.querySelector(
            ".js-validation-message"
        );

        if (level === "warning") {
            validationElement.classList.remove("s-notice__danger");
            validationElement.classList.add("s-notice__warning");
        } else {
            validationElement.classList.remove("s-notice__warning");
            validationElement.classList.add("s-notice__danger");
        }

        validationElement.classList.remove("d-none");
        validationElement.textContent = errorMessage;
    }

    hideValidationError(): void {
        const validationElement = this.uploadContainer.querySelector(
            ".js-validation-message"
        );
        validationElement.classList.add("d-none");
        validationElement.classList.remove("s-notice__warning");
        validationElement.classList.remove("s-notice__danger");
        validationElement.innerHTML = "";
    }

    showImagePreview(file: File): Promise<void> {
        const promise = new Promise<void>((resolve, reject) =>
            this.showImagePreviewAsync(file, resolve, reject)
        );

        return promise;
    }

    private showImagePreviewAsync(
        file: File,
        resolve: () => void,
        reject: (error: string) => void
    ) {
        const previewElement =
            this.uploadContainer.querySelector(".js-image-preview");

        const addImageButton =
            this.uploadContainer.querySelector<HTMLButtonElement>(
                ".js-add-image"
            );

        this.hideValidationError();
        const validationResult = this.validateImage(file);
        switch (validationResult) {
            case ValidationResult.FileTooLarge:
                this.showValidationError(
                    _t("image_upload.upload_error_file_too_big")
                );
                reject("file too large");
                return;
            case ValidationResult.InvalidFileType:
                this.showValidationError(
                    _t("image_upload.upload_error_unsupported_format")
                );
                reject("invalid filetype");
                return;
        }

        this.resetImagePreview();

        const reader = new FileReader();
        reader.addEventListener(
            "load",
            () => {
                const image = new Image();
                image.className = "hmx1 w-auto";
                image.title = file.name;
                image.src = reader.result as string;
                image.alt = _t("image_upload.uploaded_image_preview_alt");
                previewElement.appendChild(image);
                previewElement.classList.remove("d-none");
                this.image = file;
                addImageButton.disabled = false;
                resolve();
            },
            false
        );
        reader.readAsDataURL(file);
    }

    toggleExternalUrlInput(show: boolean): void {
        const cta = this.uploadContainer.querySelector(".js-cta-container");
        const container = this.uploadContainer.querySelector(
            ".js-external-url-input-container"
        );

        cta.classList.toggle("d-none", show);
        container.classList.toggle("d-none", !show);

        container.querySelector<HTMLInputElement>(
            ".js-external-url-input"
        ).value = "";
    }

    validateExternalUrl(url: string): void {
        this.resetImagePreview();
        const addImageButton =
            this.uploadContainer.querySelector<HTMLButtonElement>(
                ".js-add-image"
            );

        if (!this.validateLink(url)) {
            this.showValidationError(
                _t("image_upload.external_url_validation_error"),
                "danger"
            );
            addImageButton.disabled = true;
        } else {
            this.hideValidationError();
            addImageButton.disabled = false;
        }
    }

    resetImagePreview(): void {
        this.uploadContainer.querySelector(".js-image-preview").innerHTML = "";
        this.image = null;
        this.uploadContainer.querySelector<HTMLButtonElement>(
            ".js-add-image"
        ).disabled = true;
    }

    resetUploader(): void {
        this.resetImagePreview();
        this.toggleExternalUrlInput(false);
        this.hideValidationError();

        this.uploadField.value = null;
    }

    handleUploadTrigger(event: Event, file: File, view: EditorView): void {
        const externalUrl =
            this.uploadContainer.querySelector<HTMLInputElement>(
                ".js-external-url-input"
            ).value;
        const urlIsValue = externalUrl && this.validateLink(externalUrl);

        if (!file && !urlIsValue) {
            return;
        }

        void this.startImageUpload(view, file || externalUrl);
        this.resetUploader();
        const tr = this.tryHideInterfaceTr(view.state);
        if (tr) {
            view.dispatch(tr);
        }
        view.focus();
    }

    startImageUpload(view: EditorView, file: File | string): Promise<void> {
        // A fresh object to act as the ID for this upload
        const id = {};

        // Replace the selection with a placeholder
        const tr = view.state.tr;
        if (!tr.selection.empty) tr.deleteSelection();
        this.key.setMeta(tr, {
            add: { id, pos: tr.selection.from },
            // explicitly clear out any pasted/dropped file on upload
            file: null,
            shouldShow: false,
        });
        view.dispatch(tr);

        if (!this.uploadOptions?.handler) {
            // purposefully log an error to the dev console
            // don't use our internal `log` implementation, it only logs on dev builds
            // eslint-disable-next-line no-console
            console.error(
                "No upload handler registered. Ensure you set a proper handler on the editor's options.imageUploadHandler"
            );
            return;
        }

        return this.uploadOptions.handler(file).then(
            (url) => {
                // ON SUCCESS
                // find where we inserted our placeholder so the content insert knows where to go
                const decos = this.key.getState(view.state).decorations;
                const found = decos.find(
                    null,
                    null,
                    (spec: NodeSpec) => spec.id == id
                );
                const pos = found.length ? found[0].from : null;

                // If the content around the placeholder has been deleted, drop the image
                if (pos === null) return;

                // get the transaction from the dispatcher
                let tr = this.addTransactionDispatcher(view.state, url, pos);

                // let the plugin know it can remove the upload decoration
                tr = this.key.setMeta(tr, {
                    remove: { id },
                    shouldShow: false,
                    file: null,
                });

                view.dispatch(tr);
            },
            () => {
                // ON ERROR

                // reshow the image uploader along with an error message
                let tr = this.tryShowInterfaceTr(view.state) || view.state.tr;

                // let the plugin know it can remove the upload decoration
                tr = this.key.setMeta(tr, {
                    remove: { id },
                    shouldShow: false,
                    file: null,
                });

                view.dispatch(tr);
                this.showValidationError(
                    _t("image_upload.upload_error_generic"),
                    "error"
                );
            }
        );
    }

    update(view: EditorView): void {
        super.update(view);
        const state = this.key.getState(view.state);
        this.image = state?.file || this.image;
    }

    destroy(): void {
        this.uploadField.remove();
        this.uploadContainer.remove();
        this.image = null;
    }

    buildInterface(container: Element): void {
        if (this.image) {
            void this.showImagePreview(this.image);
        }

        // add the upload container to the menu area
        container.appendChild(this.uploadContainer);

        this.uploadContainer
            .querySelector<HTMLElement>(".js-image-uploader-input")
            .focus();
    }

    destroyInterface(container: Element): void {
        this.resetUploader();
        this.uploadContainer.classList.remove("outline-ring");
        container.removeChild(this.uploadContainer);
    }
}

/**
 * Hides the image uploader
 * @param view The current editor view
 */
export function hideImageUploader(view: EditorView): void {
    const tr = INTERFACE_KEY.hideInterfaceTr(view.state, {
        file: null,
    });

    if (tr) {
        view.dispatch(tr);
    }
}

/** Shows the image uploder
 * @param view The current editor view
 * @param file The file to upload
 */
export function showImageUploader(view: EditorView, file?: File): void {
    const tr = INTERFACE_KEY.showInterfaceTr(view.state, {
        file: file || null,
    });

    if (tr) {
        view.dispatch(tr);
    }
}

/** Checks if the image-upload functionality is enabled */
export function imageUploaderEnabled(view: EditorView): boolean {
    const state = INTERFACE_KEY.getState(view.state);

    return !!state;
}

/**
 * Creates a placeholder decoration to indicate to the user that the image is currently uploading;
 * Gets replaced with the actual image markup on upload completion
 */
function createPlaceholder(): HTMLDivElement {
    const placeholder = document.createElement("div");
    placeholder.className = "ws-normal d-block m8";
    placeholder.innerHTML = `
<div class="py6 px6 bg-black-050 bar-sm gsx gs8 d-inline-flex ai-center fw-normal fs-body1">
    <span class="s-spinner s-spinner__sm flex--item">
        <span class="v-visible-sr">Loading…</span>
    </span>
    <span class="flex--item">Uploading image…</span>
</div>
`;
    return placeholder;
}

/** The state of the image uploader plugin */
type ImageUploadState = {
    add?: {
        id: unknown;
        pos: number;
    };
    decorations?: DecorationSet;
    file: File | null;
    remove?: {
        id: unknown;
    };
    shouldShow: boolean;
};

/**
 * Adds image uploading capabilities to the editor.
 * With this plugin, you'll be able to show a popover that allows you to
 * browse for files on your file system, or use drag & drop to select images
 * to upload.
 *
 * On upload, this plugin will call the provided uploadHandler function .
 * @see defaultImageUploadHandler for an example
 *
 * @param uploadHandler A function handling file uploads. Will receive the file to upload
 * as the `file` parameter and needs to return a resolved promise with the URL of the uploaded file
 * @param containerFn A function that returns the container to insert the plugin's UI into
 * @param addTransactionDispatcher Dispatcher function that generates a transaction to dispatch to the view on image add
 */
function imageUploaderPlaceholderPlugin(
    uploadOptions: ImageUploadOptions,
    validateLink: CommonmarkParserFeatures["validateLink"],
    addTransactionDispatcher: addTransactionDispatcher
) {
    // if the required image upload options are missing, don't enable the plugin at all
    if (!uploadOptions?.handler) {
        return new Plugin({});
    }

    return new StatefulPlugin<ImageUploadState>({
        key: INTERFACE_KEY,
        state: {
            init() {
                return {
                    decorations: DecorationSet.empty,
                    file: null,
                    shouldShow: false,
                };
            },
            apply(tr: Transaction, state: ImageUploadState) {
                let set = state.decorations || DecorationSet.empty;

                // Adjust decoration positions to changes made by the transaction
                set = set.map(tr.mapping, tr.doc);

                const metadata = this.getMeta(tr);

                const returnValue: ImageUploadState = {
                    file: state.file,
                    decorations: set,
                    shouldShow: state.shouldShow,
                };

                // if no metadata was set, do not alter this state further
                if (!metadata) {
                    return returnValue;
                }

                if ("file" in metadata) {
                    returnValue.file = metadata.file;
                } else {
                    returnValue.file = null;
                }

                if ("shouldShow" in metadata) {
                    returnValue.shouldShow = metadata.shouldShow;
                }

                // See if the transaction adds or removes any placeholders
                if (metadata.add) {
                    const deco = Decoration.widget(
                        metadata.add.pos,
                        createPlaceholder(),
                        {
                            id: metadata.add.id,
                        }
                    );
                    returnValue.decorations = set.add(tr.doc, [deco]);
                } else if (metadata.remove) {
                    returnValue.decorations = set.remove(
                        set.find(
                            null,
                            null,
                            (spec: NodeSpec) => spec.id == metadata.remove.id
                        )
                    );
                }

                return returnValue;
            },
        },
        props: {
            decorations(this: StatefulPlugin<ImageUploadState>, state) {
                return this.getState(state).decorations;
            },
            handleClick(view: EditorView) {
                hideImageUploader(view);
                return false;
            },
            handleDrop(view: EditorView, event: DragEvent) {
                const files = event.dataTransfer.files;

                if (
                    view.state.selection.$from.parent.inlineContent &&
                    files.length
                ) {
                    showImageUploader(view, files[0]);
                    return true;
                }

                return false;
            },

            handlePaste(view: EditorView, event: ClipboardEvent) {
                const files = event.clipboardData.files;

                if (
                    view.state.selection.$from.parent.inlineContent &&
                    files.length
                ) {
                    showImageUploader(view, files[0]);
                    return true;
                }

                return false;
            },
        },
        view(editorView): PluginView {
            return new ImageUploader(
                editorView,
                uploadOptions,
                validateLink,
                addTransactionDispatcher
            );
        },
    });
}

/** Singleton instance of the plugin key for exported show/hide methods to reference */
const INTERFACE_KEY = new ManagedInterfaceKey<ImageUploadState>(
    "image-uploader"
);

/**
 * Adds image uploading capabilities to the editor.
 * With this plugin, you'll be able to show a popover that allows you to
 * browse for files on your file system, or use drag & drop to select images
 * to upload.
 *
 * On upload, this plugin will call the provided uploadOptions.handler function
 * @see defaultImageUploadHandler for an example
 *
 * @param uploadOptions The imageUpload options
 * @param containerFn A function that returns the container to insert the plugin's UI into
 */
export function richTextImageUpload(
    uploadOptions: ImageUploadOptions,
    validateLink: CommonmarkParserFeatures["validateLink"],
    schema: Schema
): Plugin {
    return imageUploaderPlaceholderPlugin(
        uploadOptions,
        validateLink,
        (state, url, pos) => {
            const defaultAltText = _t("image_upload.default_image_alt_text");

            const marks =
                uploadOptions.wrapImagesInLinks ||
                uploadOptions.embedImagesAsLinks
                    ? [schema.marks.link.create({ href: url })]
                    : null;

            const imgNode = uploadOptions.embedImagesAsLinks
                ? schema.text(defaultAltText, marks)
                : schema.nodes.image.create(
                      { src: url, alt: defaultAltText },
                      null,
                      marks
                  );

            return state.tr.replaceWith(pos, pos, imgNode);
        }
    );
}

//TODO markdown upload decoration doesn't really fit in visually, make it more... ascii art-ish?
/**
 * Adds image uploading capabilities to the editor.
 * With this plugin, you'll be able to show a popover that allows you to
 * browse for files on your file system, or use drag & drop to select images
 * to upload.
 *
 * On upload, this plugin will call the provided uploadOptions.handler function
 * @see defaultImageUploadHandler for an example
 *
 * @param uploadHandler The imageUpload options
 * @param containerFn A function that returns the container to insert the plugin's UI into
 */
export function commonmarkImageUpload(
    uploadOptions: ImageUploadOptions,
    validateLink: CommonmarkParserFeatures["validateLink"]
): Plugin {
    return imageUploaderPlaceholderPlugin(
        uploadOptions,
        validateLink,
        (state, url, pos) => {
            const defaultAltText = _t("image_upload.default_image_alt_text");
            // construct the raw markdown
            let mdString = `![${defaultAltText}](${url})`;
            let selectionStart = pos + 2;
            let selectionEnd = selectionStart + defaultAltText.length;

            if (uploadOptions.embedImagesAsLinks) {
                // strip off the leading `!`
                mdString = mdString.slice(1);
                selectionStart -= 1;
                selectionEnd -= 1;
            } else if (uploadOptions.wrapImagesInLinks) {
                mdString = `[${mdString}](${url})`;
                selectionStart += 1;
                selectionEnd += 1;
            }

            // insert into the document
            const tr = state.tr.insertText(mdString, pos);

            // pre-select the alt text so the user can just start typing after insert
            // NOTE: these are not magic numbers, just hardcoded indexes for the above string
            tr.setSelection(
                TextSelection.create(
                    state.apply(tr).doc,
                    selectionStart,
                    selectionEnd
                )
            );

            return tr;
        }
    );
}
