import {
    defaultMarkdownSerializer,
    MarkdownSerializer,
    MarkdownSerializerState,
} from "prosemirror-markdown";
import { Node as ProsemirrorNode, Mark } from "prosemirror-model";
import { error } from "../shared/logger";
import { ExternalEditorPlugin } from "../shared/external-editor-plugin";
import {
    selfClosingElements,
    supportedTagAttributes,
    TagType,
} from "../shared/html-helpers";
import { normalizeReference } from "markdown-it/lib/common/utils";
import { richTextSchema } from "./schema";

// helper type so the code is a tad less messy
export type MarkdownSerializerNodes = ConstructorParameters<
    typeof MarkdownSerializer
>[0];

type MarkdownSerializerMarks = ConstructorParameters<
    typeof MarkdownSerializer
>[1];

class SOMarkdownSerializerState extends MarkdownSerializerState {
    declare out: string;
    private linkReferenceDefinitions: {
        [key: string]: {
            href: string;
            title: string;
        };
    } = {};

    constructor(
        nodes: MarkdownSerializerNodes,
        marks: MarkdownSerializerMarks,
        options: { [key: string]: unknown }
    ) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error TODO constructor not exposed in types
        super(nodes, marks, options);
    }

    /** Adds a link reference definition for rendering at the very end */
    addLinkReferenceDefinition(
        label: string,
        href: string,
        title?: string
    ): void {
        const normalizedLabel = normalizeReference(label);

        if (this.linkReferenceDefinitions[normalizedLabel]) {
            return;
        }

        this.linkReferenceDefinitions[normalizedLabel] = {
            href,
            title,
        };
    }

    /** Writes all saved linked reference definitions to the state */
    writeLinkReferenceDefinitions(): void {
        const refs = Object.keys(this.linkReferenceDefinitions);

        if (!refs.length) {
            return;
        }

        refs.sort().forEach((r) => {
            const def = this.linkReferenceDefinitions[r];
            this.ensureNewLine();
            this.write("[");
            this.text(r);
            this.write("]: ");
            this.text(def.href);

            if (def.title) {
                this.text(` "${def.title}"`);
            }
        });
    }
}

class SOMarkdownSerializer extends MarkdownSerializer {
    serialize(content: ProsemirrorNode, options?: { [key: string]: unknown }) {
        const state = new SOMarkdownSerializerState(
            this.nodes,
            this.marks,
            options || {}
        );
        state.renderContent(content);
        state.writeLinkReferenceDefinitions();

        return state.out;
    }
}

/** Renders a node as wrapped in html tags if the markup attribute is html */
function renderHtmlTag(
    state: MarkdownSerializerState,
    node: ProsemirrorNode,
    tagType: TagType
): boolean {
    const markup = node.attrs.markup as string;
    if (!markup) {
        return false;
    }

    // TODO naive check for now, but we should probably do something more robust
    if (!markup.startsWith("<") || !markup.endsWith(">")) {
        return false;
    }

    const tag = markup.replace(/[<>/\s]/g, "");
    const openingTagStart = `<${tag}`;

    // start writing the opening tag
    state.text(openingTagStart, false);

    // write the attributes if necessary
    if (supportedTagAttributes[tagType]) {
        // render the attributes in alpha order, since we cannot know what order they were originally written in
        const attributes = supportedTagAttributes[tagType].sort();
        for (const attr of attributes) {
            const value = node.attrs[attr] as string;
            if (value) {
                state.text(` ${attr}="${value}"`);
            }
        }
    }

    // if the tag is self closing, just render the closing part of the original markup and return early
    if (selfClosingElements.includes(tagType)) {
        state.text(markup.replace(openingTagStart, ""), false);
        return true;
    }

    // close the opening tag
    state.text(">", false);
    // TODO will this always be inline content?
    state.renderInline(node);
    // @ts-expect-error TODO when writing to a closed block, it injects newline chars...
    state.closed = false;
    state.text(`</${tag}>`, false);
    state.closeBlock(node);

    return true;
}

// TODO There's no way to sanely override these without completely rewriting them
// TODO Should contribute this back upstream and remove
const defaultMarkdownSerializerNodes: MarkdownSerializerNodes = {
    ...defaultMarkdownSerializer.nodes,
    blockquote(state, node) {
        if (renderHtmlTag(state, node, TagType.blockquote)) {
            return;
        }

        const markup = (node.attrs.markup as string) || ">";
        state.wrapBlock(markup + " ", null, node, () =>
            state.renderContent(node)
        );
    },
    code_block(state, node) {
        // TODO could be html...
        const markup = node.attrs.markup as string;

        // lack of a markup indicator means this is an indented code block
        if (!markup) {
            const lines = node.textContent.split("\n");
            lines.forEach((l, i) => {
                if (i > 0) {
                    state.ensureNewLine();
                }

                state.text("    " + l, false);
            });
        } else {
            state.write(markup + ((node.attrs.params as string) || "") + "\n");
            state.text(node.textContent, false);
            state.ensureNewLine();
            state.write(markup);
        }

        state.closeBlock(node);
    },
    heading(state, node) {
        const markup = (node.attrs.markup as string) || "";

        if (renderHtmlTag(state, node, TagType.heading)) {
            return;
        } else if (markup && !markup.startsWith("#")) {
            // "underlined" heading (Setext heading)
            state.renderInline(node);
            state.ensureNewLine();
            state.write(markup); //TODO write once or write the entire length of the text?
            state.closeBlock(node);
        } else {
            // markup is # (ATX heading) or empty
            state.write(state.repeat("#", node.attrs.level) + " ");
            state.renderInline(node);
            state.closeBlock(node);
        }
    },
    horizontal_rule(state, node) {
        if (renderHtmlTag(state, node, TagType.horizontal_rule)) {
            return;
        }

        state.write(node.attrs.markup || "----------");
        state.closeBlock(node);
    },
    bullet_list(state, node) {
        if (renderHtmlTag(state, node, TagType.unordered_list)) {
            return;
        }

        const markup = (node.attrs.markup as string) || "-";
        state.renderList(node, "  ", () => markup + " ");
    },
    ordered_list(state, node) {
        if (renderHtmlTag(state, node, TagType.ordered_list)) {
            return;
        }

        const start = (node.attrs.order as number) || 1;
        const maxW = String(start + node.childCount - 1).length;
        const space = state.repeat(" ", maxW + 2);
        const markup = (node.attrs.markup as string) || ".";
        state.renderList(node, space, (i) => {
            const nStr = String(start + i);
            return state.repeat(" ", maxW - nStr.length) + nStr + markup + " ";
        });
    },
    list_item(state, node) {
        if (renderHtmlTag(state, node, TagType.list_item)) {
            return;
        }
        state.renderContent(node);
    },
    paragraph(state, node) {
        if (renderHtmlTag(state, node, TagType.paragraph)) {
            return;
        }
        state.renderInline(node);
        state.closeBlock(node);
    },

    image(state, node) {
        if (renderHtmlTag(state, node, TagType.image)) {
            return;
        }

        const title = node.attrs.title
            ? // @ts-expect-error TODO types might be wrong here
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-plus-operands
              " " + state.quote(node.attrs.title)
            : "";
        state.write(
            "![" +
                state.esc(node.attrs.alt || "") +
                "](" +
                state.esc(node.attrs.src) +
                title +
                ")"
        );
    },
    hard_break(state, node, parent, index) {
        if (renderHtmlTag(state, node, TagType.hardbreak)) {
            return;
        }

        for (let i = index + 1; i < parent.childCount; i++) {
            if (parent.child(i).type != node.type) {
                // `[space][space][newline]` or `\[newline]`
                state.write(node.attrs.markup || "  \n");
                return;
            }
        }
    },
    text(state, node) {
        const linkMark = node.marks.find((m) => m.type.name === "link");
        let text = node.text;

        // if the text node is from a link, use the original href text if the original markup used it
        if (["linkify", "autolink"].includes(linkMark?.attrs.markup)) {
            text = linkMark.attrs.href as string;
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const startOfLine: boolean = state.atBlank() || state.closed;
        // escape the text using the built in escape code
        let escapedText = state.esc(text, startOfLine);

        // built in escape doesn't get all the cases TODO upstream!
        escapedText = escapedText
            .replace(/\\_/g, "_")
            .replace(/\b_|_\b/g, "\\_");
        escapedText = escapedText.replace(/([<>])/g, "\\$1");

        state.text(escapedText, false);
    },
};

// extend the default markdown serializer's nodes and add our own
const customMarkdownSerializerNodes: MarkdownSerializerNodes = {
    // TODO
    html_inline(state, node) {
        state.write(node.attrs.content);
        state.ensureNewLine();
        state.write("\n");
    },

    // TODO
    html_block(state, node) {
        state.write(node.attrs.content);
    },

    // TODO
    html_block_container(state, node) {
        state.write(node.attrs.contentOpen);

        // ensure the opening content had a newline and write a newline
        // since that terminated the html_block and caused the container creation
        state.ensureNewLine();
        state.write("\n");

        state.renderContent(node);
        state.write(node.attrs.contentClose);
        state.closeBlock(node);
    },

    // write softbreaks back to a newline character
    softbreak(state) {
        state.write("\n");
    },

    table(state, node) {
        function serializeTableHead(head: ProsemirrorNode) {
            let columnAlignments: string[] = [];
            head.forEach((headRow) => {
                if (headRow.type === richTextSchema.nodes.table_row) {
                    columnAlignments = serializeTableRow(headRow);
                }
            });
            state.ensureNewLine();

            // write table header separator
            for (const alignment of columnAlignments) {
                state.write("|");

                state.write(
                    alignment === "left" || alignment === "center" ? ":" : " "
                );
                state.write("---");
                state.write(
                    alignment === "right" || alignment === "center" ? ":" : " "
                );
            }
            state.write("|");
        }

        function serializeTableBody(body: ProsemirrorNode) {
            body.forEach((bodyRow) => {
                if (bodyRow.type === richTextSchema.nodes.table_row) {
                    serializeTableRow(bodyRow);
                }
            });
        }

        function serializeTableRow(row: ProsemirrorNode): string[] {
            const columnAlignment: string[] = [];
            state.ensureNewLine();
            row.forEach((cell) => {
                if (
                    cell.type === richTextSchema.nodes.table_header ||
                    cell.type === richTextSchema.nodes.table_cell
                ) {
                    const alignment = serializeTableCell(cell);
                    columnAlignment.push(alignment);
                }
            });
            state.write("|");
            return columnAlignment;
        }

        function serializeTableCell(cell: ProsemirrorNode): string | null {
            state.write("| ");
            state.renderInline(cell);
            state.write(" ");

            return findAlignment(cell);
        }

        function findAlignment(cell: ProsemirrorNode): string | null {
            const alignment = cell.attrs.style as string;
            if (!alignment) {
                return null;
            }

            // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
            const match = alignment.match(/text-align:[ ]?(left|right|center)/);

            if (match && match[1]) {
                return match[1];
            }

            return null;
        }

        node.forEach((table_child) => {
            if (table_child.type === richTextSchema.nodes.table_head)
                serializeTableHead(table_child);
            if (table_child.type === richTextSchema.nodes.table_body)
                serializeTableBody(table_child);
        });

        state.closeBlock(node);
    },

    tagLink(state, node) {
        const isMeta = node.attrs.tagType === "meta-tag";
        const prefix = isMeta ? "meta-tag" : "tag";
        const tag = node.attrs.tagName as string;
        state.write(`[${prefix}:${tag}]`);
    },

    spoiler(state, node) {
        state.wrapBlock(">! ", null, node, () => state.renderContent(node));
    },
};

/**
 * Generates a config from a base config that is aware of special "markup" added by the markdown tokenizer;
 * typically this will be differences in how markdown can be written (e.g. * vs _ for emphasis),
 * but could also be html tags from our extended html support plugin (e.g. * vs <em> for emphasis)
 * @param config The base config to extend
 */
function genMarkupAwareMarkConfig(
    config: MarkdownSerializer["marks"]["string"]
) {
    // we don't support function open/close since these could have fairly complicated logic in them
    if (config.open instanceof Function || config.close instanceof Function) {
        // log an error to the console and return the unmodified base config
        error(
            "markdown-serializer genMarkupAwareMarkSpec",
            "Unable to extend mark config with open/close as functions",
            config
        );
        return config;
    }

    return {
        ...config,
        open(_: MarkdownSerializerState, mark: Mark) {
            const markup = mark.attrs.markup as string;
            return markup || config.open;
        },
        close(_: MarkdownSerializerState, mark: Mark) {
            let markup = mark.attrs.markup as string;
            // insert the `/` on html closing tags
            markup = /^<[a-z]+>$/i.test(markup)
                ? markup.replace(/^</, "</")
                : markup;
            return markup || config.close;
        },
    } as typeof config;
}

// add support for html/linkify marked-up links (defaulting back to the default serializer otherwise)
const defaultLinkMarkDeserializer = defaultMarkdownSerializer.marks.link;
const extendedLinkMarkDeserializer: typeof defaultLinkMarkDeserializer = {
    open(state, mark, parent, index) {
        if (!mark.attrs.markup) {
            return typeof defaultLinkMarkDeserializer.open === "string"
                ? defaultLinkMarkDeserializer.open
                : defaultLinkMarkDeserializer.open(state, mark, parent, index);
        }

        if (mark.attrs.markup === "reference") {
            (state as SOMarkdownSerializerState).addLinkReferenceDefinition(
                mark.attrs.referenceLabel,
                mark.attrs.href,
                mark.attrs.title
            );
            return "[";
        }

        // linkify detected links are left bare
        if (mark.attrs.markup === "linkify") {
            return "";
        }

        if (mark.attrs.markup === "autolink") {
            return "<";
        }

        const titleAttr = mark.attrs.title
            ? ` title="${mark.attrs.title as string}"`
            : "";
        const hrefAttr = mark.attrs.href
            ? ` href="${mark.attrs.href as string}"`
            : "";

        return `<a${hrefAttr}${titleAttr}>`;
    },
    close(state, mark, parent, index) {
        if (!mark.attrs.markup) {
            return typeof defaultLinkMarkDeserializer.close === "string"
                ? defaultLinkMarkDeserializer.close
                : defaultLinkMarkDeserializer.close(state, mark, parent, index);
        }

        if (mark.attrs.markup === "reference") {
            switch (mark.attrs.referenceType) {
                case "full":
                    return `][${mark.attrs.referenceLabel as string}]`;
                case "collapsed":
                    return "][]";
                case "shortcut":
                default:
                    return "]";
            }
        }

        // linkify detected links are left bare
        if (mark.attrs.markup === "linkify") {
            return "";
        }

        if (mark.attrs.markup === "autolink") {
            return ">";
        }

        return `</a>`;
    },
};

// add support for <code> markup
const defaultCodeMarkDeserializer = defaultMarkdownSerializer.marks.code;
const extendedCodeMarkDeserializer: typeof defaultCodeMarkDeserializer = {
    open(state, mark, parent, index) {
        if (typeof defaultCodeMarkDeserializer.open === "string") {
            return (
                (mark.attrs.markup as string) ||
                defaultCodeMarkDeserializer.open
            );
        }

        // run the backing method to get where the markup should be placed
        // TODO the types are incorrect, the correct return type is "string", not "void"
        let defaultResult = defaultCodeMarkDeserializer.open(
            state,
            mark,
            parent,
            index
        ) as unknown as string;

        if (mark.attrs.markup) {
            defaultResult = defaultResult.replace("`", mark.attrs.markup);
        }

        return defaultResult;
    },
    close(state, mark, parent, index) {
        if (typeof defaultCodeMarkDeserializer.close === "string") {
            return (
                (mark.attrs.markup as string) ||
                defaultCodeMarkDeserializer.close
            );
        }

        // run the backing method to get where the markup should be placed
        // TODO the types are incorrect, the correct return type is "string", not "void"
        let defaultResult = defaultCodeMarkDeserializer.close(
            state,
            mark,
            parent,
            index
        ) as unknown as string;

        if (mark.attrs.markup) {
            // insert the `/` on html closing tags
            const markup = (mark.attrs.markup as string).replace(/^</, "</");
            defaultResult = defaultResult.replace("`", markup);
        }

        return defaultResult;
    },
    escape: defaultCodeMarkDeserializer.escape,
};

// extend the default markdown serializer's marks and add our own
const customMarkdownSerializerMarks: MarkdownSerializerMarks = {
    ...defaultMarkdownSerializer.marks,
    em: genMarkupAwareMarkConfig(defaultMarkdownSerializer.marks.em),
    strong: genMarkupAwareMarkConfig(defaultMarkdownSerializer.marks.strong),
    code: extendedCodeMarkDeserializer,
    link: extendedLinkMarkDeserializer,
    strike: genMarkupAwareMarkConfig({
        open: "~~",
        close: "~~",
        mixable: true,
        expelEnclosingWhitespace: true,
    }),
    kbd: genMarkupAwareMarkConfig({
        open: "<kbd>",
        close: "</kbd>",
        mixable: true,
        expelEnclosingWhitespace: true,
    }),
    sup: genMarkupAwareMarkConfig({
        open: "<sup>",
        close: "</sup>",
        mixable: true,
        expelEnclosingWhitespace: true,
    }),
    sub: genMarkupAwareMarkConfig({
        open: "<sub>",
        close: "</sub>",
        mixable: true,
        expelEnclosingWhitespace: true,
    }),
};

// export our custom serializer using the extended nodes/marks taken from the default schema
export const stackOverflowMarkdownSerializer = (
    externalPlugin: ExternalEditorPlugin
): MarkdownSerializer =>
    new SOMarkdownSerializer(
        {
            ...defaultMarkdownSerializerNodes,
            ...customMarkdownSerializerNodes,
            ...externalPlugin.markdownSerializers,
        },
        customMarkdownSerializerMarks
    );
