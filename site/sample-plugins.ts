import type MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline";
import type Token from "markdown-it/lib/token";
import type { Node, Schema } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { EditorPlugin2 } from "../src/shared/editor-plugin";
import type { MenuCommand } from "../src/shared/menu";

// NOTE: loaded from cdn in views/plugin.html
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mermaid: any;
    }
}

// simple proof of concept that adds mermaid support
const mermaidPlugin: EditorPlugin2 = (api) => {
    api.addCodeBlockProcessor("mermaid", (content, container) => {
        return new Promise<void>((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            window.mermaid.render("TODO_ID", content, (svg: string) => {
                // This is a sample plugin and mermaid sanitizes for us, so we don't need to worry about XSS
                // eslint-disable-next-line no-unsanitized/property
                container.innerHTML = svg;
                resolve();
            });
        });
    });
};

// simple proof of concept that adds furigana support from https://japanese.meta.stackexchange.com/questions/806/how-should-i-format-my-questions-on-japanese-language-se/807#807
// due to the fact that we cannot directly alter the contenteditable content, we have to make these some sort of node/mark...
// TODO might be worth implementing this in the same manner as e.g. mathjax
// NOTE: functionality taken from https://cdn.sstatic.net/Js/third-party/japanese-l-u.js
const japaneseSEPlugin: EditorPlugin2 = (api) => {
    api.extendMarkdown(
        {
            parser: {
                jse_furigana: {
                    mark: "jse_furigana",
                    getAttrs: (token: Token) => {
                        return {
                            text: token.content,
                            markup: token.attrGet("markup"),
                        };
                    },
                },
            },
            serializers: {
                nodes: {},
                marks: {
                    jse_furigana: {
                        open: (_, mark) => mark.attrs.markup as string,
                        close: (_, mark) => {
                            const markup = mark.attrs.markup as string;
                            return markup === "{" ? "}" : "】";
                        },
                    },
                },
            },
        },
        (mdit) => {
            mdit.use((md: MarkdownIt) => {
                md.inline.ruler.push("jse", function jse(state, silent) {
                    const startCharCode = state.src.charCodeAt(state.pos);

                    // quick fail on first character
                    if (
                        startCharCode !== 0x7b /* { */ &&
                        startCharCode !== 0x3010 /* 【 */
                    ) {
                        return false;
                    }

                    const endCharCode =
                        startCharCode === 0x7b /* { */
                            ? 0x7d /* } */
                            : 0x3011; /* 】 */

                    const endCharPos = findEndChar(
                        state,
                        state.pos + 1,
                        false,
                        startCharCode,
                        endCharCode
                    );

                    if (endCharPos < 0) {
                        return false;
                    }

                    if (!silent) {
                        const totalContent = state.src.slice(
                            state.pos,
                            endCharPos + 1
                        );
                        const text = totalContent.slice(1, -1);

                        let token = state.push("jse_furigana_open", "span", 1);
                        token.attrSet(
                            "markup",
                            String.fromCharCode(startCharCode)
                        );
                        token.content = text;

                        token = state.push("text", "", 0);
                        token.content = text;

                        token = state.push("jse_furigana_close", "span", -1);
                        token.attrSet(
                            "markup",
                            String.fromCharCode(endCharCode)
                        );
                    }

                    state.pos = endCharPos + 1;
                    return true;
                });
            });
        }
    );

    api.extendSchema((schema) => {
        schema.marks = schema.marks.addToEnd("jse_furigana", {
            attrs: {
                text: { default: "" },
                markup: { default: "" },
            },
            toDOM: (mark) => {
                return [
                    "span",
                    {
                        "class": "jse-furigana",
                        "data-text": mark.attrs.text as string,
                    },
                ];
            },
            parseDOM: [
                {
                    tag: "span.jse-furigana",
                },
                {
                    tag: "span.rt",
                },
            ],
        });

        return schema;
    });
};

// simple proof of concept that adds some menu items and plugins to the editor
const sillyPlugin: EditorPlugin2 = (api) => {
    function getCurrentEffectNode(state: EditorState) {
        const { from, to } = state.selection;
        let currentEffectNode: Node = null;

        // TODO taken from rich-text/commands/index.ts:nodeTypeActive()
        state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === state.schema.nodes.silly_effect.name) {
                currentEffectNode = node;
            }
            return !currentEffectNode;
        });

        return currentEffectNode;
    }

    api.extendSchema((schema) => {
        schema.nodes = schema.nodes.addToEnd("silly_effect", {
            content: "block+",
            group: "block",
            attrs: {
                effect: { default: "🎉" },
            },
            toDOM: (node) => {
                return [
                    "div",
                    {
                        class: `silly-effect silly-effect--${
                            node.attrs.effect as string
                        }`,
                    },
                    0,
                ];
            },
        });

        return schema;
    });

    api.extendMarkdown(
        {
            parser: {},
            serializers: {
                nodes: {},
                marks: {},
            },
        },
        null
    );

    api.addMenuItems((schema: Schema) => {
        const addSillyEffectRichCommand =
            (char: string): MenuCommand =>
            (state, dispatch) => {
                if (dispatch) {
                    let tr = state.tr;
                    const currentEffectNode = getCurrentEffectNode(state);

                    const { $from, $to } = state.selection;
                    const nodeRange = $from.blockRange($to);

                    // TODO would be nice to expose our helper functions in a way that safely tree-shakes the rest
                    if (currentEffectNode) {
                        tr = tr.lift(nodeRange, nodeRange.depth - 1);
                    } else {
                        tr = tr.wrap($from.blockRange($to), [
                            {
                                type: schema.nodes.silly_effect,
                                attrs: {
                                    effect: char,
                                },
                            },
                        ]);
                    }

                    dispatch(tr);
                }
                return true;
            };

        const addSillyEffectCommonmarkCommand =
            (char: string): MenuCommand =>
            (state, dispatch) => {
                if (dispatch) {
                    const tr = state.tr.insertText(char);
                    dispatch(tr);
                }
                return true;
            };

        return [
            {
                name: "silly",
                priority: 100,
                entries: [
                    {
                        richText: null,
                        commonmark: null,
                        keybind: "Mod-Shift-1",

                        svg: "HandRock",
                        label: "Silly",
                        key: "silly-menu",

                        children: [
                            {
                                key: "silly-menu-item-0",
                                svg: "Tada",
                                label: "Tada",
                                richText: addSillyEffectRichCommand("🎉"),
                                commonmark:
                                    addSillyEffectCommonmarkCommand("🎉"),
                            },
                            {
                                key: "silly-menu-item-1",
                                svg: "Hundred",
                                label: "Hundred",
                                richText: addSillyEffectRichCommand("💯"),
                                commonmark:
                                    addSillyEffectCommonmarkCommand("💯"),
                            },
                            {
                                key: "silly-menu-item-2",
                                svg: "Wave",
                                label: "Wave",
                                richText: addSillyEffectRichCommand("👋"),
                                commonmark:
                                    addSillyEffectCommonmarkCommand("👋"),
                            },
                        ],
                    },
                ],
            },
        ];
    });

    // this would likely be better served as a NodeView, but I'm testing _plugins_ here
    const sillyEffectPlugin = new Plugin<{ decorations: DecorationSet }>({
        state: {
            init() {
                return {
                    decorations: DecorationSet.empty,
                };
            },
            apply(tr, value, _, newState) {
                if (!tr.docChanged) {
                    return {
                        decorations: value.decorations.map(tr.mapping, tr.doc),
                    };
                }

                const node = getCurrentEffectNode(newState);

                if (!node) {
                    return value;
                }

                const decos = DecorationSet.create(newState.doc, [
                    Decoration.inline(tr.selection.from - 1, tr.selection.to, {
                        "class": "silly-effect__effect",
                        "data-effect": node.attrs.effect as string,
                    }),
                ]);

                return {
                    decorations: decos,
                };
            },
        },
        props: {
            decorations(this: Plugin<{ decorations: DecorationSet }>, state) {
                return this.getState(state).decorations;
            },
        },
    });

    //api.addCommonmarkPlugin(sillyEffectPlugin);
    api.addRichTextPlugin(sillyEffectPlugin);
};

export const samplePlugins = [mermaidPlugin, japaneseSEPlugin, sillyPlugin];

function findEndChar(
    state: StateInline,
    start: number,
    disableNested: boolean,
    startCharCode: number,
    endCharCode: number
) {
    let level,
        found,
        marker,
        prevPos,
        labelEnd = -1;
    const max = state.posMax,
        oldPos = state.pos;

    state.pos = start + 1;
    level = 1;

    while (state.pos < max) {
        marker = state.src.charCodeAt(state.pos);
        if (marker === endCharCode) {
            level--;
            if (level === 0) {
                found = true;
                break;
            }
        }

        prevPos = state.pos;
        state.md.inline.skipToken(state);
        if (marker === startCharCode) {
            if (prevPos === state.pos - 1) {
                // increase level if we find text `startCharCode`, which is not a part of any token
                level++;
            } else if (disableNested) {
                state.pos = oldPos;
                return -1;
            }
        }
    }

    if (found) {
        labelEnd = state.pos;
    }

    // restore old state
    state.pos = oldPos;

    return labelEnd;
}
