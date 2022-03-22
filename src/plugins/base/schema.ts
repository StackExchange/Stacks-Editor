import { schema } from "prosemirror-markdown";
import { NodeSpec, MarkSpec } from "prosemirror-model";
import { PluginSchemaSpec } from "../../builder/types";
import OrderedMap from "orderedmap";

export function generateBasicSchema(): PluginSchemaSpec {
    // manually render softbreaks, making sure to mark them
    // so we when parse them back out we can convert back to \n for markdown
    const softbreakSpec: NodeSpec = {
        content: "inline+",
        attrs: {},
        marks: "_",
        inline: true,
        group: "inline",
        // TODO accurate? necessary?
        parseDOM: [
            {
                tag: "span[softbreak]",
                getAttrs(node: HTMLElement) {
                    return {
                        content: node.innerHTML,
                    };
                },
            },
        ],
        toDOM() {
            return [
                "span",
                {
                    softbreak: "",
                },
                0,
            ];
        },
    };

    const defaultNodes = schema.spec.nodes as OrderedMap<NodeSpec>;

    const extendedImageSpec: NodeSpec = {
        ...defaultNodes.get("image"),
        ...{
            attrs: {
                src: {},
                alt: { default: null },
                title: { default: null },
                width: { default: null },
                height: { default: null },
            },
            parseDOM: [
                {
                    tag: "img[src]",
                    getAttrs(dom: HTMLElement) {
                        return {
                            src: dom.getAttribute("src"),
                            title: dom.getAttribute("title"),
                            alt: dom.getAttribute("alt"),
                            height: dom.getAttribute("height"),
                            width: dom.getAttribute("width"),
                        };
                    },
                },
            ],
            toDOM(node) {
                return ["img", node.attrs];
            },
        },
    };

    const extendedCodeblockSpec: NodeSpec = {
        ...defaultNodes.get("code_block"),
        ...{
            attrs: {
                params: { default: "" },
                detectedHighlightLanguage: { default: "" },
            },
        },
    };

    const nodes = defaultNodes
        .addBefore("image", "softbreak", softbreakSpec)
        .update("image", extendedImageSpec)
        .update("code_block", extendedCodeblockSpec);

    const defaultMarks = schema.spec.marks as OrderedMap<MarkSpec>;

    const defaultLinkMark = defaultMarks.get("link");
    const extendedLinkMark: MarkSpec = {
        ...defaultLinkMark,
        ...{
            attrs: {
                ...defaultLinkMark.attrs,
                referenceType: { default: "" },
                referenceLabel: { default: "" },
            },
            toDOM(node) {
                return [
                    "a",
                    {
                        href: node.attrs.href as string,
                        title: node.attrs.title as string,
                    },
                ];
            },
        },
    };

    const defaultCodeMark = defaultMarks.get("code");
    const extendedCodeMark: MarkSpec = {
        ...defaultCodeMark,
        exitable: true,
        inclusive: true,
    };

    const marks = defaultMarks
        .update("link", extendedLinkMark)
        .update("code", extendedCodeMark);

    // for *every* mark, add in support for the `markup` attribute
    // we use this to save the "original" html tag used to create the mark when converting from html markdown
    // this is important because a user could use either `<b>` or `<strong>` to create bold, and we want to preserve this when converting back
    marks.forEach((k: string, node: MarkSpec) => {
        const attrs = node.attrs || {};
        attrs.markup = { default: "" };
        node.attrs = attrs;
    });

    // ditto for nodes
    nodes.forEach((k: string, node: NodeSpec) => {
        if (k === "text") {
            return;
        }

        const attrs = node.attrs || {};
        attrs.markup = { default: "" };
        node.attrs = attrs;
    });

    // create our new, final schema using the extended nodes/marks taken from `schema`
    return {
        nodes: nodes,
        marks: marks,
    };
}
