import packageJson from "../package.json";
import type { StacksEditor, StacksEditorOptions } from "../src";
import { StackSnippetsPlugin } from "../src/external-plugins/stack-snippets";
import type { LinkPreviewProvider } from "../src/rich-text/plugins/link-preview";
import type { ImageUploadOptions } from "../src/shared/prosemirror-plugins/image-upload";
import "./site.less";

function domReady(callback: (e: Event) => void) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback);
    } else {
        callback(null);
    }
}

function getDefaultEditor(): number {
    return +localStorage.getItem("defaultEditor") || 0;
}

function setDefaultEditor(value: number) {
    localStorage.setItem("defaultEditor", value.toString());
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
    domainTest: /^https?:\/\/(www\.)?(example\.com)|(example\.org)/i,
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

/**
 * Sample image handler that processes the uploaded image and returns a data url
 * rather than sending it to an external service
 */
const ImageUploadHandler: ImageUploadOptions["handler"] = (file) =>
    setTimeoutAsync(2000).then(() => {
        return new Promise(function (resolve) {
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
    const enableTables = place.classList.contains("js-tables-enabled");
    const enableImages = !place.classList.contains("js-images-disabled");

    const imageUploadOptions: ImageUploadOptions = {
        handler: ImageUploadHandler,
        brandingHtml: "Powered by... <strong>Nothing!</strong>",
        contentPolicyHtml:
            "These images are uploaded nowhere, so no content policy applies",
        wrapImagesInLinks: true,
    };

    // TODO should null out entire object, but that currently just defaults back to the original on merge
    // if not loading images, then null handler should ensure that image options not included
    if (!enableImages) {
        imageUploadOptions["handler"] = null;
    }

    // asynchronously load the required bundles
    void import("../src/index").then(function ({ StacksEditor }) {
        const options: StacksEditorOptions = {
            defaultView: getDefaultEditor(),
            editorHelpLink: "#TODO",
            commonmarkOptions: {},
            parserFeatures: {
                tables: enableTables,
                tagLinks: {
                    allowNonAscii: false,
                    allowMetaTags: true,
                    renderer: (tagName, isMetaTag) => {
                        return {
                            link: "#" + tagName,
                            linkTitle:
                                "Show questions tagged '" + tagName + "'",
                            additionalClasses: isMetaTag
                                ? ["s-tag__muted"]
                                : [],
                        };
                    },
                },
            },
            richTextOptions: {
                linkPreviewProviders: [ExampleLinkPreviewProvider],
            },
            imageUpload: imageUploadOptions,
            externalPlugins: [StackSnippetsPlugin],
        };

        const editorInstance = new StacksEditor(place, content.value, options);

        // set the instance on the window for developers to poke around in
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        (window as any)["editorInstance"] = editorInstance;

        if (place2) {
            const secondEditorInstance = new StacksEditor(
                place2,
                content.value,
                options
            );

            // set the instance on the window for developers to poke around in
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            (window as any)["secondEditorInstance"] = secondEditorInstance;
        }
    });

    place.addEventListener(
        "StacksEditor:view-change",
        (e: CustomEvent<{ editorType: number }>) => {
            setDefaultEditor(e.detail.editorType);
        }
    );

    place2?.addEventListener(
        "StacksEditor:view-change",
        (e: CustomEvent<{ editorType: number }>) => {
            setDefaultEditor(e.detail.editorType);
        }
    );
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
