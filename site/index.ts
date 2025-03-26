import "@stackoverflow/stacks";
import MarkdownIt from "markdown-it";
import packageJson from "../package.json";
import {
    EditorPlugin,
    registerLocalizationStrings,
    StacksEditor,
    StacksEditorOptions,
} from "../src";
import { PreviewRenderer } from "../src/commonmark/editor";
import type { LinkPreviewProvider } from "../src/rich-text/plugins/link-preview";
import type { ImageUploadOptions } from "../src/shared/prosemirror-plugins/image-upload";
import { sleepAsync } from "../test/rich-text/test-helpers";
import { markdownLogging } from "../plugins/devx";
import { codeDetectionPlugin, sillyPlugin, mermaidPlugin, japaneseSEPlugin } from "../plugins/sample";
import "./site.css";

function domReady(callback: (e: Event) => void) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback);
    } else {
        callback(null);
    }
}

function getDefaultEditor(): { type: number; previewShown: boolean } {
    return {
        type: +localStorage.getItem("defaultEditor") || 0,
        previewShown: localStorage.getItem("previewShownByDefault") === "true",
    };
}

function setDefaultEditor(value: number, previewShown: boolean) {
    localStorage.setItem("defaultEditor", value.toString());
    localStorage.setItem("previewShownByDefault", previewShown.toString());
}

function setTimeoutAsync(delay: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), Math.max(delay, 2000));
    });
}

/**
 * Sample preview provider attached to `example.com` domain that simulates
 * a fetch by waiting five seconds from time of request to time of render
 */
export const ExampleLinkPreviewProvider: LinkPreviewProvider = {
    domainTest: /^https?:\/\/(www\.)?(example\.com)/i,
    renderer: (url: string) => {
        let returnValue: string = null;

        // only render example.com urls, no matter what's registered downstream
        if (url.includes("example.com")) {
            const date = new Date().toString();
            // NOTE: usually we'd use escapeHTML here, but I don't want to pull in any of the bundle (for demo purposes)
            returnValue = `
            <div class="s-link-preview js-onebox">
                <div class="s-link-preview--header">
                    <div>
                        <a href="${url}" target="_blank" class="s-link-preview--title">Example link preview</a>
                        <div class="s-link-preview--details">Not really a real link preview, but it acts like one!</div>
                    </div>
                </div>
                <div class="s-link-preview--body">
                    <strong>This is a link preview, yo.</strong><br><br>We can run arbitrary JS in here, so here's the current date:<br><em>${date}</em>
                </div>
            </div>`;
        }

        return setTimeoutAsync(5000).then(() => {
            const el = document.createElement("div");
            // Note: local development only, don't care to sanitize and don't want to import escapeHTML
            // eslint-disable-next-line no-unsanitized/property
            el.innerHTML = returnValue;
            return el;
        });
    },
};

export const ExampleTextOnlyLinkPreviewProvider: LinkPreviewProvider = {
    domainTest: /^https?:\/\/(www\.)?(example\.org)/i,
    renderer: (url) =>
        setTimeoutAsync(0).then(() =>
            document.createTextNode(`Example domain (${new URL(url).pathname})`)
        ),
    textOnly: true,
};

/**
 * Sample image handler that processes the uploaded image and returns a data url
 * rather than sending it to an external service
 */
const ImageUploadHandler: ImageUploadOptions["handler"] = (file) =>
    setTimeoutAsync(2000).then(() => {
        return new Promise(function (resolve) {
            if (typeof file === "string") {
                resolve(file);
                return;
            }

            // if the serviceworker is registered, send it the image and use the local image url hack instead
            if (navigator.serviceWorker.controller) {
                const id = Math.floor(Math.random() * 1000);
                navigator.serviceWorker.controller.postMessage({
                    id: id,
                    content: file,
                });
                resolve(`https://images.local/${id}`);
            } else {
                // read the image in and translate it to a data url to use in the <img> tag
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.addEventListener("load", () =>
                    resolve(reader.result as string)
                );
            }
        });
    });

/**
 * Sample preview renderer that has a fake delay and uses the default Markdown-It renderer
 * NOTE: synchronous renderers can simply return Promise.resolve()
 */
const examplePreviewRenderer: PreviewRenderer = async (content, container) => {
    // add a fake load delay (because we can)
    await sleepAsync(500);

    const instance = MarkdownIt("commonmark", {
        html: false,
    });
    // html support is disabled above (and this is a simple demo anyways)
    // eslint-disable-next-line no-unsanitized/property
    container.innerHTML = instance.render(content);

    // add a disclaimer to our demo renderer so people don't report unrelated rendering bugs
    const disclaimer = document.createElement("p");
    disclaimer.className = "fs-fine fc-light mb4";
    disclaimer.textContent =
        "This demo is using the default MarkdownIt renderer, so don't expect anything fancy.";
    container.prepend(disclaimer);
};

domReady(() => {
    const versionNumber = document.querySelector(".js-version-number");
    if (versionNumber) {
        versionNumber.textContent = packageJson.version;
    }

    document
        .querySelector(".js-repo-link")
        ?.setAttribute("href", packageJson.repository.url);

    document
        .querySelector("#js-toggle-dark")
        ?.addEventListener("change", (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            document.body.classList.toggle("theme-dark");
        });

    document
        .querySelector("#js-toggle-theme")
        ?.addEventListener("change", (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            document.body.classList.toggle("theme-custom");
            document.body.classList.toggle("themed");
        });

    document
        .querySelector("#js-toggle-contrast")
        ?.addEventListener("change", (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            document.body.classList.toggle("theme-highcontrast");
        });

    document
        .querySelector("#js-toggle-readonly")
        ?.addEventListener("change", (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            const editor = (window as any).editorInstance as StacksEditor;

            editor.readonly ? editor.enable() : editor.disable();
        });

    // create the editor
    const place = document.querySelector<HTMLElement>("#example-1");
    const place2 = document.querySelector<HTMLElement>("#example-2");
    const content = document.querySelector<HTMLTextAreaElement>("#content");
    const enableImages = !place.classList.contains("js-images-disabled");
    const enableSamplePlugin = place.classList.contains("js-plugins-enabled");
    const enableMDPreview = place.classList.contains("js-md-preview-enabled");
    const enableDevxPlugin = place.classList.contains("js-dev-plugins-enabled");

    const imageUploadOptions: ImageUploadOptions = {
        handler: ImageUploadHandler,
        brandingHtml: "Powered by... <strong>Nothing!</strong>",
        contentPolicyHtml:
            "These images are uploaded nowhere, so no content policy applies",
        wrapImagesInLinks: true,
        allowExternalUrls: true,
        warningNoticeHtml: enableSamplePlugin
            ? "Images are useful in a post, but <strong>make sure the post is still clear without them</strong>.  If you post images of code or error messages, copy and paste or type the actual code or message into the post directly."
            : null,
    };

    // TODO should null out entire object, but that currently just defaults back to the original on merge
    // if not loading images, then null handler should ensure that image options not included
    if (!enableImages) {
        imageUploadOptions["handler"] = null;
    }

    registerLocalizationStrings({
        menubar: {
            mode_toggle_richtext_title: "Localization test: Rich text mode",
            mode_toggle_markdown_title: "Localization test: Markdown mode",
        },
    });

    const defaultEditor = getDefaultEditor();
    let plugins: EditorPlugin[] = [];
    if (enableSamplePlugin) {
        plugins = [
            ...plugins,
            codeDetectionPlugin,
            japaneseSEPlugin,
            mermaidPlugin,
            sillyPlugin
        ];
    }
    if (enableDevxPlugin) {
        plugins = [
            ...plugins,
            markdownLogging
        ];
    }

    const options: StacksEditorOptions = {
        defaultView: defaultEditor.type,
        editorHelpLink: "#HELP_LINK",
        commonmarkOptions: {
            preview: {
                enabled: enableMDPreview,
                shownByDefault: defaultEditor.previewShown,
                renderer: examplePreviewRenderer,
            },
        },
        parserFeatures: {
            tables: true,
            tagLinks: {
                render: (tagName, isMetaTag) => {
                    return {
                        link: "#" + tagName,
                        linkTitle: "Show questions tagged '" + tagName + "'",
                        additionalClasses: isMetaTag ? ["s-tag__muted"] : [],
                    };
                },
            },
        },
        placeholderText: "This is placeholder text, so start typing…",
        richTextOptions: {
            linkPreviewProviders: [
                ExampleTextOnlyLinkPreviewProvider,
                ExampleLinkPreviewProvider,
            ],
        },
        imageUpload: imageUploadOptions,
        editorPlugins: plugins,
        elementAttributes: {
            id: "a11y-editor-id",
            ariaLabeledby: "a11y-editor-label",
        },
    };

    const editorInstance = new StacksEditor(place, content.value, options);

    // set the instance on the window for developers to poke around in
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (window as any)["editorInstance"] = editorInstance;

    if (place2) {
        // update element attributes that should be unique per editor
        options.elementAttributes.id = "a11y-editor-id-2";
        options.elementAttributes.ariaLabeledby = "a11y-editor-id-2";

        const secondEditorInstance = new StacksEditor(
            place2,
            content.value,
            options
        );

        // set the instance on the window for developers to poke around in
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        (window as any)["secondEditorInstance"] = secondEditorInstance;
    }

    place.addEventListener(
        "StacksEditor:view-change",
        (e: CustomEvent<{ editorType: number; previewShown: boolean }>) => {
            setDefaultEditor(e.detail.editorType, e.detail.previewShown);
        }
    );

    place2?.addEventListener(
        "StacksEditor:view-change",
        (e: CustomEvent<{ editorType: number; previewShown: boolean }>) => {
            setDefaultEditor(e.detail.editorType, e.detail.previewShown);
        }
    );

    // if the help link button is clicked, show the user an alert instead of opening the non-existent help page
    document.querySelectorAll(".js-help-link").forEach((el) => {
        el.addEventListener("click", (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            // eslint-disable-next-line no-alert
            alert(
                "The demo help link doesn't actually go anywhere, so enjoy this alert instead. :)"
            );
        });
    });
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("/serviceworker.bundle.js").then(
            () => {
                // eslint-disable-next-line no-console
                console.log(
                    "ServiceWorker registration successful; uploaded image interception enabled"
                );
            },
            (err) => {
                // eslint-disable-next-line no-console
                console.log("ServiceWorker registration failed: ", err);
            }
        );
    });
}
