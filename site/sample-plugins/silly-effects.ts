import type { Node, Schema } from "prosemirror-model";
import { type EditorState, Plugin } from "prosemirror-state";
import { DecorationSet, Decoration } from "prosemirror-view";
import type { EditorPlugin, EditorPluginSpec } from "../../src";
import type { MenuCommand } from "../../src/shared/menu";

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

const addMenuItems: EditorPluginSpec["menuItems"] = function (schema: Schema) {
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
            name: "other",
            entries: [
                {
                    richText: null,
                    commonmark: null,
                    keybind: "Mod-Shift-1",

                    key: "silly-menu",
                    display: {
                        svg: "HandRock",
                        label: "Silly",
                    },

                    children: [
                        {
                            key: "silly-menu-item-0",
                            display: {
                                svg: "Tada",
                                label: "Tada",
                            },
                            richText: addSillyEffectRichCommand("🎉"),
                            commonmark: addSillyEffectCommonmarkCommand("🎉"),
                        },
                        {
                            key: "silly-menu-item-1",
                            display: {
                                svg: "Hundred",
                                label: "Hundred",
                            },
                            richText: addSillyEffectRichCommand("💯"),
                            commonmark: addSillyEffectCommonmarkCommand("💯"),
                        },
                        {
                            key: "silly-menu-item-2",
                            display: {
                                svg: "Wave",
                                label: "Wave",
                            },
                            richText: addSillyEffectRichCommand("👋"),
                            commonmark: addSillyEffectCommonmarkCommand("👋"),
                        },
                    ],
                },
            ],
        },
    ];
};

// simple proof of concept plugin showcasing custom menu items and ProseMirror plugins
export const sillyPlugin: EditorPlugin = () => ({
    extendSchema: (schema) => {
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
    },

    menuItems: addMenuItems,

    richText: {
        plugins: [sillyEffectPlugin],
    },
});
