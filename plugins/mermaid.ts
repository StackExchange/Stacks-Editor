import type { EditorPlugin } from "../src";

// NOTE: loaded from cdn in views/plugin.html
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mermaid: any;
    }
}

// simple proof of concept that adds mermaid support
export const mermaidPlugin: EditorPlugin = () => ({
    codeBlockProcessors: [
        {
            lang: "mermaid",
            callback: (content, container) => {
                // TODO support returning promises?
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                window.mermaid.render("TODO_ID", content, (svg: string) => {
                    // This is a sample plugin and mermaid sanitizes for us, so we don't need to worry about XSS
                    // eslint-disable-next-line no-unsanitized/property
                    container.innerHTML = svg;
                });

                return true;
            },
        },
    ],
});
