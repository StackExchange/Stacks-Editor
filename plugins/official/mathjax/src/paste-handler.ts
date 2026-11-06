import { MarkdownParser } from "prosemirror-markdown";
import { Fragment, Node as ProseMirrorNode, Slice } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import {
    defaultDisplayDelimiters,
    defaultInlineDelimiters,
    MathJaxDelimiter,
    MathJaxOptions,
} from "./common";
import { findClosingDelimiter, isEscaped } from "./schema";

interface MathMatch {
    open: string;
    close: string;
    source: string;
    end: number;
}

/** Build a paste handler that uses the editor's fully configured parser. */
export function mathJaxPasteHandler(
    markdownParser: MarkdownParser,
    options?: MathJaxOptions
): Plugin {
    return new Plugin({
        props: {
            handlePaste(view, event, slice) {
                if (
                    view.state.selection.$from.parent.type.spec.code ||
                    view.state.selection.$from
                        .marks()
                        .some((mark) => mark.type.spec.code)
                ) {
                    return false;
                }

                if (event.clipboardData?.getData("text/html")) {
                    const transformed = transformRichTextSlice(slice, options);
                    if (!transformed) {
                        return false;
                    }

                    view.dispatch(
                        view.state.tr
                            .replaceSelection(transformed)
                            .scrollIntoView()
                    );
                    return true;
                }

                const text = event.clipboardData?.getData("text/plain");
                if (!text || !hasPotentialMath(text, options)) {
                    return false;
                }

                try {
                    const parsed = markdownParser.parse(text);
                    if (!containsMath(parsed)) {
                        return false;
                    }

                    view.dispatch(
                        view.state.tr
                            .replaceSelection(Slice.maxOpen(parsed.content))
                            .scrollIntoView()
                    );
                    return true;
                } catch {
                    // Let normal paste handling preserve unsupported content.
                    return false;
                }
            },
        },
    });
}

function containsMath(node: ProseMirrorNode): boolean {
    let found = false;
    node.descendants((descendant) => {
        if (
            descendant.type.name === "math_inline" ||
            descendant.type.name === "math_block"
        ) {
            found = true;
            return false;
        }
        return !found;
    });
    return found;
}

function hasPotentialMath(text: string, options?: MathJaxOptions): boolean {
    const delimiters = [
        ...(options?.inlineDelimiters ?? defaultInlineDelimiters),
        ...(options?.displayDelimiters ?? defaultDisplayDelimiters),
    ];
    return delimiters.some(([open]) => text.includes(open));
}

function transformRichTextSlice(
    slice: Slice,
    options?: MathJaxOptions
): Slice | null {
    const result = transformFragment(slice.content, options);
    return result.changed
        ? new Slice(result.fragment, slice.openStart, slice.openEnd)
        : null;
}

function transformFragment(
    fragment: Fragment,
    options: MathJaxOptions | undefined
): { fragment: Fragment; changed: boolean } {
    const transformed: ProseMirrorNode[] = [];
    let changed = false;

    fragment.forEach((node) => {
        if (node.isText) {
            const textNodes = transformTextNode(node, options);
            transformed.push(...textNodes.nodes);
            changed ||= textNodes.changed;
            return;
        }

        if (node.isLeaf || node.type.spec.code) {
            transformed.push(node);
            return;
        }

        const childResult = transformFragment(node.content, options);
        transformed.push(
            childResult.changed ? node.copy(childResult.fragment) : node
        );
        changed ||= childResult.changed;
    });

    return {
        fragment: changed ? Fragment.fromArray(transformed) : fragment,
        changed,
    };
}

function transformTextNode(
    node: ProseMirrorNode,
    options?: MathJaxOptions
): { nodes: ProseMirrorNode[]; changed: boolean } {
    if (node.marks.some((mark) => mark.type.spec.code)) {
        return { nodes: [node], changed: false };
    }

    const text = node.text ?? "";
    const schema = node.type.schema;
    const inlineNode = schema.nodes.math_inline;
    const escapedDollarNode = schema.nodes.math_escaped_dollar;
    if (!inlineNode || !escapedDollarNode) {
        return { nodes: [node], changed: false };
    }

    const inlineDelimiters =
        options?.inlineDelimiters ?? defaultInlineDelimiters;
    const displayDelimiters =
        options?.displayDelimiters ?? defaultDisplayDelimiters;
    const nodes: ProseMirrorNode[] = [];
    let textStart = 0;
    let cursor = 0;

    const appendText = (end: number) => {
        if (end > textStart) {
            nodes.push(schema.text(text.slice(textStart, end), node.marks));
        }
    };

    while (cursor < text.length) {
        if (text.startsWith("\\$", cursor) && !isEscaped(text, cursor)) {
            appendText(cursor);
            nodes.push(escapedDollarNode.create(null, null, node.marks));
            cursor += 2;
            textStart = cursor;
            continue;
        }

        const startsWithDisplayDelimiter = displayDelimiters.some(([open]) =>
            text.startsWith(open, cursor)
        );
        const match = startsWithDisplayDelimiter
            ? null
            : findMathAt(text, cursor, inlineDelimiters);
        if (match) {
            appendText(cursor);
            nodes.push(
                inlineNode.create(
                    {
                        source: match.source,
                        openDelimiter: match.open,
                        closeDelimiter: match.close,
                    },
                    null,
                    node.marks
                )
            );
            cursor = match.end;
            textStart = cursor;
            continue;
        }

        cursor++;
    }

    if (textStart === 0) {
        return { nodes: [node], changed: false };
    }

    appendText(text.length);
    return { nodes, changed: true };
}

function findMathAt(
    text: string,
    start: number,
    delimiters: readonly MathJaxDelimiter[]
): MathMatch | null {
    const delimiter = [...delimiters]
        .sort(([left], [right]) => right.length - left.length)
        .find(
            ([open]) => text.startsWith(open, start) && !isEscaped(text, start)
        );
    if (!delimiter) {
        return null;
    }

    const [open, close] = delimiter;
    const contentStart = start + open.length;
    const closeIndex = findClosingDelimiter(text, close, contentStart);
    const source =
        closeIndex === -1 ? "" : text.slice(contentStart, closeIndex);
    if (closeIndex === -1 || !source.trim()) {
        return null;
    }

    return {
        open,
        close,
        source,
        end: closeIndex + close.length,
    };
}
