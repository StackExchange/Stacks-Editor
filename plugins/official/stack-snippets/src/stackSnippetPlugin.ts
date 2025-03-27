/** This is an effort to turn the existing structure back into an external plugin while keeping the same functionality*/
import type { EditorPlugin } from "../../../../src";
import {
    stackSnippetMarkdownParser,
    stackSnippetMarkdownSerializer,
    stackSnippetPlugin as markdownPlugin,
    stackSnippetRichTextNodeSpec,
} from "./schema";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { StackSnippetView } from "./snippet-view";
import { StackSnippetOptions } from "./common";
import { stackSnippetPasteHandler } from "./paste-handler";
import { makeMenuButton } from "../../../../src/shared/menu";
import { _t } from "../../../../src/shared/localization";
import { getShortcut } from "../../../../src/shared/utils";
import { openSnippetModal } from "./commands";

/**
 * Build the StackSnippet plugin using hoisted options that can be specified at runtime
 *
 * This allows callers to specify how to handle rendering and modal opening of buttons externally to the editor.
 * **/
export const stackSnippetPlugin: (opts?: StackSnippetOptions) => EditorPlugin =
    (opts) => () => ({
        richText: {
            nodeViews: {
                stack_snippet: (
                    node: ProseMirrorNode,
                    view: EditorView,
                    getPos: () => number
                ) => {
                    return new StackSnippetView(node, view, getPos, opts);
                },
            },
            plugins: [stackSnippetPasteHandler],
        },
        extendSchema: (schema) => {
            schema.nodes = schema.nodes.append(stackSnippetRichTextNodeSpec);
            return schema;
        },
        markdown: {
            parser: {
                ...stackSnippetMarkdownParser,
            },
            serializers: {
                nodes: {
                    ...stackSnippetMarkdownSerializer,
                },
                marks: {},
            },
            alterMarkdownIt: (mdit) => {
                mdit.use(markdownPlugin);
            },
        },
        menuItems: (schema, coreMenus) => {
            const clone = coreMenus.find((mb) => mb.name == "code-formatting");

            return [
                {
                    ...clone,
                    entries: [
                        {
                            key: "openSnippetModal",
                            richText: {
                                command: openSnippetModal(opts),
                            },
                            commonmark: {
                                command: openSnippetModal(opts),
                            },
                            display: makeMenuButton(
                                "StackSnippets",
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
                        },
                    ],
                },
            ];
        },
    });
