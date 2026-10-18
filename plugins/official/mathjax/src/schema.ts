import MarkdownIt, { Token } from "markdown-it";
import { MarkdownParser } from "prosemirror-markdown";
import { NodeSpec } from "prosemirror-model";
import { MarkdownSerializerNodes } from "../../../../src";
import {
    defaultDisplayDelimiters,
    defaultInlineDelimiters,
    MathJaxDelimiter,
    MathJaxOptions,
} from "./common";

const mathInlineToken = "math_inline";
const mathBlockToken = "math_block";
const escapedDollarToken = "math_escaped_dollar";

/** Determine whether the character at an index is escaped. */
function isEscaped(source: string, index: number): boolean {
    let backslashes = 0;
    for (let i = index - 1; i >= 0 && source[i] === "\\"; i--) {
        backslashes++;
    }
    return backslashes % 2 === 1;
}

/** Find an unescaped closing delimiter in Markdown source. */
function findClosingDelimiter(
    source: string,
    close: string,
    from: number
): number {
    let index = source.indexOf(close, from);
    while (index !== -1 && isEscaped(source, index)) {
        index = source.indexOf(close, index + close.length);
    }
    return index;
}

/** Find an unescaped Markdown code-span boundary. */
function findCodeBoundary(source: string, from: number): number {
    let index = source.indexOf("`", from);
    while (index !== -1 && isEscaped(source, index)) {
        index = source.indexOf("`", index + 1);
    }
    return index;
}

/** Attach preserved delimiter metadata to a Markdown token. */
function setMathTokenAttributes(
    token: Token,
    source: string,
    openDelimiter: string,
    closeDelimiter: string
): void {
    token.content = source;
    token.attrSet("openDelimiter", openDelimiter);
    token.attrSet("closeDelimiter", closeDelimiter);
}

/** Build the Markdown-it inline rule for MathJax formulas. */
function inlineMathRule(
    delimiters: readonly MathJaxDelimiter[]
): MarkdownIt.ParserInline.RuleInline {
    const orderedDelimiters = [...delimiters].sort(
        ([left], [right]) => right.length - left.length
    );

    const ignoredClosers = new WeakMap<object, Set<number>>();

    return (state, silent) => {
        const ignoredForState = ignoredClosers.get(state);
        if (ignoredForState?.has(state.pos)) {
            if (!silent) {
                ignoredForState.delete(state.pos);
            }
            return false;
        }

        const delimiter = orderedDelimiters.find(([open]) =>
            state.src.startsWith(open, state.pos)
        );
        if (!delimiter) {
            return false;
        }

        const [open, close] = delimiter;
        const contentStart = state.pos + open.length;
        const closeIndex = findClosingDelimiter(state.src, close, contentStart);
        if (closeIndex === -1 || closeIndex === contentStart) {
            return false;
        }

        const codeBoundary = findCodeBoundary(state.src, contentStart);
        if (codeBoundary !== -1 && codeBoundary < closeIndex) {
            if (!silent) {
                const ignored = ignoredForState ?? new Set<number>();
                ignored.add(closeIndex);
                ignoredClosers.set(state, ignored);
            }
            return false;
        }

        if (!silent) {
            const token = state.push(mathInlineToken, "math", 0);
            setMathTokenAttributes(
                token,
                state.src.slice(contentStart, closeIndex),
                open,
                close
            );
        }

        state.pos = closeIndex + close.length;
        return true;
    };
}

/** Build the Markdown-it block rule for MathJax display formulas. */
function blockMathRule(
    delimiters: readonly MathJaxDelimiter[]
): MarkdownIt.ParserBlock.RuleBlock {
    const orderedDelimiters = [...delimiters].sort(
        ([left], [right]) => right.length - left.length
    );

    return (state, startLine, endLine, silent) => {
        const start = state.bMarks[startLine] + state.tShift[startLine];
        const delimiter = orderedDelimiters.find(([open]) =>
            state.src.startsWith(open, start)
        );
        if (!delimiter) {
            return false;
        }

        const [open, close] = delimiter;
        const sourceLines: string[] = [];
        let nextLine = startLine;
        let foundClose = false;

        for (let line = startLine; line < endLine; line++) {
            const lineStart = state.bMarks[line] + state.tShift[line];
            const lineContent = state.src.slice(lineStart, state.eMarks[line]);
            const content =
                line === startLine
                    ? lineContent.slice(open.length)
                    : lineContent;

            if (line !== startLine && /^(?:`{3,}|~{3,})/.test(content)) {
                return false;
            }

            const closeIndex = findClosingDelimiter(content, close, 0);
            if (closeIndex === -1) {
                sourceLines.push(content);
                continue;
            }

            if (content.slice(closeIndex + close.length).trim()) {
                return false;
            }

            sourceLines.push(content.slice(0, closeIndex));
            nextLine = line + 1;
            foundClose = true;
            break;
        }

        const source = sourceLines.join("\n");
        if (!foundClose || !source) {
            return false;
        }

        if (!silent) {
            const token = state.push(mathBlockToken, "math", 0);
            setMathTokenAttributes(token, source, open, close);
            token.map = [startLine, nextLine];
        }

        state.line = nextLine;
        return true;
    };
}

/** Configure Markdown-it to tokenize MathJax outside Markdown code. */
export function mathJaxMarkdownPlugin(
    markdownIt: MarkdownIt,
    options?: MathJaxOptions
): void {
    const inlineDelimiters =
        options?.inlineDelimiters ?? defaultInlineDelimiters;
    const displayDelimiters =
        options?.displayDelimiters ?? defaultDisplayDelimiters;

    markdownIt.inline.ruler.before(
        "escape",
        mathInlineToken,
        inlineMathRule(inlineDelimiters)
    );
    markdownIt.inline.ruler.before(
        mathInlineToken,
        escapedDollarToken,
        (state, silent) => {
            if (!state.src.startsWith("\\$", state.pos)) {
                return false;
            }

            if (!silent) {
                const token = state.push(escapedDollarToken, "span", 0);
                token.content = "$";
            }
            state.pos += 2;
            return true;
        }
    );
    markdownIt.block.ruler.before(
        "fence",
        mathBlockToken,
        blockMathRule(displayDelimiters)
    );
}

export const mathJaxMarkdownParser: MarkdownParser["tokens"] = {
    [escapedDollarToken]: {
        node: escapedDollarToken,
    },
    [mathInlineToken]: {
        node: mathInlineToken,
        getAttrs: (token: Token) => ({
            source: token.content,
            openDelimiter: token.attrGet("openDelimiter"),
            closeDelimiter: token.attrGet("closeDelimiter"),
        }),
    },
    [mathBlockToken]: {
        node: mathBlockToken,
        getAttrs: (token: Token) => ({
            source: token.content,
            openDelimiter: token.attrGet("openDelimiter"),
            closeDelimiter: token.attrGet("closeDelimiter"),
        }),
    },
};

export const mathJaxMarkdownSerializer: MarkdownSerializerNodes = {
    [escapedDollarToken](state) {
        state.write("\\$");
    },
    [mathInlineToken](state, node) {
        state.write(
            `${node.attrs.openDelimiter as string}${
                node.attrs.source as string
            }${node.attrs.closeDelimiter as string}`
        );
    },
    [mathBlockToken](state, node) {
        const markdown = `${node.attrs.openDelimiter as string}${
            node.attrs.source as string
        }${node.attrs.closeDelimiter as string}`;
        markdown.split("\n").forEach((line, index) => {
            if (index > 0) {
                state.ensureNewLine();
            }
            state.write(line);
        });
        state.closeBlock(node);
    },
};

const mathAttributes: NodeSpec["attrs"] = {
    source: { default: "" },
    openDelimiter: { default: "" },
    closeDelimiter: { default: "" },
};

export const mathJaxRichTextNodeSpec: { [name: string]: NodeSpec } = {
    [escapedDollarToken]: {
        inline: true,
        group: "inline",
        atom: true,
        selectable: true,
        toDOM: () => [
            "span",
            { class: "stacks-editor-math-escaped-dollar" },
            "$",
        ],
    },
    [mathInlineToken]: {
        inline: true,
        group: "inline",
        atom: true,
        selectable: true,
        attrs: mathAttributes,
        toDOM: (node) => [
            "span",
            { class: "stacks-editor-math stacks-editor-math-inline" },
            `${node.attrs.openDelimiter as string}${node.attrs.source as string}${
                node.attrs.closeDelimiter as string
            }`,
        ],
    },
    [mathBlockToken]: {
        group: "block",
        atom: true,
        selectable: true,
        attrs: mathAttributes,
        toDOM: (node) => [
            "div",
            { class: "stacks-editor-math stacks-editor-math-display" },
            `${node.attrs.openDelimiter as string}${node.attrs.source as string}${
                node.attrs.closeDelimiter as string
            }`,
        ],
    },
};
