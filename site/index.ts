import { stacksEditorAsync } from "../src/browser";
import "./site.less";
import type { StacksEditor } from "../src";
import type { LinkPreviewProvider } from "../src/rich-text/plugins/link-preview";
import { StackSnippetsPlugin } from "../src/external-plugins/stack-snippets";

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

/**
 * Sample preview provider attached to `example.com` domain that simulates
 * a fetch by waiting one second from time of request to time of render
 */
export const ExampleLinkPreviewProvider: LinkPreviewProvider = {
    domainTest: /^https?:\/\/(www\.)?(example\.com)|(example\.org)/i,
    renderer: (url: string) => {
        return fetch("/posts/link-previews?url=" + encodeURIComponent(url))
            .then((r) => r.json())
            .then((r: { data: string }) => {
                if (!r.data) {
                    return null;
                }

                const el = document.createElement("div");
                el.innerHTML = r.data;
                return el;
            });
    },
};

domReady(() => {
    document
        .querySelector(".js-toggle-dark")
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            document.body.classList.toggle("theme-dark");
        });

    document
        .querySelector(".js-toggle-readonly")
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            const editor = (window as any).editorInstance as StacksEditor;

            editor.readonly ? editor.enable() : editor.disable();
        });

    // create the editor
    const place = document.querySelector<HTMLElement>("#example-1");
    const content = document.querySelector<HTMLTextAreaElement>("#content");
    const enableTables = place.classList.contains("js-tables-enabled");
    const enableImages = !place.classList.contains("js-images-disabled");

    const imageUploadOptions: { [key: string]: unknown } = {
        brandingHtml: "Powered by... <strong>Nothing!</strong>",
        contentPolicyHtml:
            "These images are uploaded nowhere, so no content policy applies",
    };

    // TODO should null out entire object, but that currently just defaults back to the original on merge
    // if not loading images, then null handler should ensure that image options not included
    if (!enableImages) {
        imageUploadOptions["handler"] = null;
    }

    // asynchronously load the required bundles
    void stacksEditorAsync(place, content.value, {
        defaultView: getDefaultEditor(),
        editorHelpLink: "#TODO",
        commonmarkOptions: {},
        parserFeatures: { tables: enableTables },
        richTextOptions: {
            linkPreviewProviders: [ExampleLinkPreviewProvider],
        },
        imageUpload: imageUploadOptions,
        externalPlugins: [StackSnippetsPlugin],
    }).then((editorInstance) => {
        // set the instance on the window for developers to poke around in
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        (window as any)["editorInstance"] = editorInstance;
    });

    place.addEventListener(
        "StacksEditor:view-change",
        (e: CustomEvent<{ editorType: number }>) => {
            setDefaultEditor(e.detail.editorType);
        }
    );
});
