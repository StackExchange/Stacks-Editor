import { NodeSpec, Slice } from "prosemirror-model";
import { EditorPlugin } from "../../builder/types";
import { spoilerToggle } from "./spoiler-toggle";
import OrderedMap from "orderedmap";
import { spoiler } from "./spoiler";

const spoilerNodeSpec: NodeSpec = {
    content: "block+",
    group: "block",
    attrs: { revealed: { default: false } },
    parseDOM: [
        {
            tag: "blockquote.spoiler",
            getAttrs(node: HTMLElement) {
                return {
                    revealed: node.classList.contains("is-visible"),
                };
            },
        },
    ],
    toDOM(node) {
        return [
            "blockquote",
            {
                "class": "spoiler" + (node.attrs.revealed ? " is-visible" : ""),
                // TODO localization
                "data-spoiler": "Reveal spoiler",
            },
            0,
        ];
    },
};

export const spoilerPlugin: EditorPlugin = {
    optionDefaults: {},
    schema: (s) => {
        s.nodes = s.nodes.addToEnd("spoiler", spoilerNodeSpec);
        return s;
    },
    richText: () => ({
        plugins: [spoilerToggle],
    }),
    markdownParser: () => ({
        tokens: {
            spoiler: {
                block: "spoiler",
            },
        },
        plugins: [],
    }),
    configureMarkdownIt: (instance) => {
        instance.use(spoiler);
    },
};
