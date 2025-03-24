/** This is an effort to turn the existing structure back into an external plugin while keeping the same functionality*/
import type {EditorPlugin} from "../../../src";
import {
    stackSnippetMarkdownParser,
    stackSnippetMarkdownSerializer,
    stackSnippetPlugin as markdownPlugin,
    stackSnippetRichTextNodeSpec
} from "./schema";
import {Node as ProseMirrorNode} from "prosemirror-model";
import {EditorView} from "prosemirror-view";
import {StackSnippetView} from "./snippet-view";
import {StackSnippetOptions} from "./common";
import {error, log} from "../../../src/shared/logger";
import {stackSnippetPasteHandler} from "./paste-handler";
import {makeMenuButton} from "../../../src/shared/menu";
import {_t} from "../../../src/shared/localization";
import {getShortcut} from "../../../src/shared/utils";
import {openSnippetModal} from "./commands";


//TODO: Naturally this will have to live outside the Editor itself.
// Which was kinda of the point, right? We wanted it to interface with the existing Stack Snippets editor in the first pass.
const snippetOpts: StackSnippetOptions = {
    renderer: (meta, js, css, html) => {
        const data = {
            js: js,
            css: css,
            html: html,
            console: meta.console,
            babel: meta.babel,
            babelPresetReact: meta.babelPresetReact,
            babelPresetTS: meta.babelPresetTS,
        };
        return fetch("/snippets/js", {
            method: "POST",
            body: new URLSearchParams(data),
        })
            .then((res) => res.text())
            .then((html) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");
                return doc;
            })
            .catch((err) => {
                error("test harness - snippet render", err);
                const div = document.createElement("div");
                const freeRealEstate = document.createElement("img");
                freeRealEstate.src =
                    "https://i.kym-cdn.com/entries/icons/original/000/021/311/free.jpg";
                div.appendChild(freeRealEstate);
                return div;
            });
    },
    openSnippetsModal: (meta, js, css, html) => {
        log(
            "test harness - open modal event",
            `meta\n${JSON.stringify(meta)}`
        );
        log(
            "test harness - open modal event",
            `js\n${JSON.stringify(js)}`
        );
        log(
            "test harness - open modal event",
            `css\n${JSON.stringify(css)}`
        );
        log(
            "test harness - open modal event",
            `html\n${JSON.stringify(html)}`
        );
    }
};

export const stackSnippetPlugin: EditorPlugin = () => ({
    richText: {
        nodeViews: {
            stack_snippet: (
                node: ProseMirrorNode,
                view: EditorView,
                getPos: () => number
            ) => {
                return new StackSnippetView(
                    node,
                    view,
                    getPos,
                    snippetOpts
                );
            }
        },
        plugins: [
            stackSnippetPasteHandler
        ]
    },
    extendSchema: (schema) => {
        schema.nodes = schema.nodes.append(stackSnippetRichTextNodeSpec);
        return schema;
    },
    markdown: {
        parser: {
            ...stackSnippetMarkdownParser
        },
        serializers: {
            nodes: {
                ...stackSnippetMarkdownSerializer
            },
            marks: {},
        },
        alterMarkdownIt: (mdit) => {
            mdit.use(markdownPlugin);
        }
    },
    menuItems: (schema, coreMenus) => {
        const clone = coreMenus.find(mb => mb.name == "code-formatting");

        return [
            {
                ...clone,
                entries: [
                    {
                        key: "openSnippetModal",
                        richText: {
                            command: openSnippetModal(snippetOpts),
                        },
                        commonmark: {
                            command: openSnippetModal(snippetOpts),
                        },
                        display: makeMenuButton(
                            "Play",
                            {
                                title: _t("commands.stack_snippet.title", {
                                    shortcut: getShortcut("Mod-9"),
                                }),
                                description: _t(
                                    "commands.stack_snippet.description"
                                ),
                            },
                            "stack-snippet-open-btn"
                        ),
                    }
                ]
            }
        ]
    }
});
