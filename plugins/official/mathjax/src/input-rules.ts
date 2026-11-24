import { InputRule, inputRules } from "prosemirror-inputrules";
import {
    EditorState,
    Plugin,
    TextSelection,
    Transaction,
} from "prosemirror-state";
import {
    defaultDisplayDelimiters,
    defaultInlineDelimiters,
    MathJaxDelimiter,
    MathJaxOptions,
} from "./common";

const inlineNodeName = "math_inline";
const blockNodeName = "math_block";

interface MathJaxRule {
    inputRule: InputRule;
    match: RegExp;
    handler: (
        state: EditorState,
        match: RegExpMatchArray,
        start: number,
        end: number
    ) => Transaction | null;
}

/** Escape a string so it can be embedded in a regular expression. */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Determine whether the character at an index is escaped. */
function isEscaped(source: string, index: number): boolean {
    let backslashes = 0;
    for (let i = index - 1; i >= 0 && source[i] === "\\"; i--) {
        backslashes++;
    }
    return backslashes % 2 === 1;
}

/** Determine whether an index is inside an unfinished Markdown code span. */
function isInsideCodeSpan(source: string, index: number): boolean {
    let activeRunLength = 0;

    for (let cursor = 0; cursor < index; cursor++) {
        if (source[cursor] !== "`" || isEscaped(source, cursor)) {
            continue;
        }

        let runEnd = cursor + 1;
        while (runEnd < index && source[runEnd] === "`") {
            runEnd++;
        }

        const runLength = runEnd - cursor;
        if (activeRunLength === 0) {
            activeRunLength = runLength;
        } else if (runLength === activeRunLength) {
            activeRunLength = 0;
        }

        cursor = runEnd - 1;
    }

    return activeRunLength !== 0;
}

/** Build a non-empty, single-line capture that stops at the closing delimiter. */
function sourceCapture(close: string): string {
    return `((?:(?!${escapeRegExp(close)})[^\\n])+?)`;
}

/** Convert a completed inline formula into an atomic rich-text node. */
function inlineMathInputRule(
    [open, close]: MathJaxDelimiter,
    displayDelimiters: readonly MathJaxDelimiter[]
): MathJaxRule {
    const expression = new RegExp(
        `(^|.)${escapeRegExp(open)}${sourceCapture(close)}${escapeRegExp(close)}$`
    );
    const handler: MathJaxRule["handler"] = (state, match, start, end) => {
        const prefix = match[1] ?? "";
        const source = match[2];
        const matchIndex = match.index ?? 0;
        const openIndex = matchIndex + prefix.length;
        const closeIndex = matchIndex + match[0].length - close.length;
        const startsWithDisplayDelimiter = displayDelimiters.some(
            ([displayOpen]) =>
                displayOpen.length > open.length &&
                displayOpen.endsWith(open) &&
                match.input.slice(
                    openIndex - (displayOpen.length - open.length),
                    openIndex + open.length
                ) === displayOpen
        );

        if (
            !source.trim() ||
            isEscaped(match.input, openIndex) ||
            isEscaped(match.input, closeIndex) ||
            isInsideCodeSpan(match.input, openIndex) ||
            startsWithDisplayDelimiter
        ) {
            return null;
        }

        const nodeType = state.schema.nodes[inlineNodeName];
        if (!nodeType) {
            return null;
        }

        return state.tr.replaceWith(
            start + prefix.length,
            end,
            nodeType.create({
                source,
                openDelimiter: open,
                closeDelimiter: close,
            })
        );
    };

    return {
        inputRule: new InputRule(expression, handler, { inCodeMark: false }),
        match: expression,
        handler,
    };
}

/** Convert a completed, paragraph-sized display formula into a block node. */
function blockMathInputRule([open, close]: MathJaxDelimiter): MathJaxRule {
    const expression = new RegExp(
        `^${escapeRegExp(open)}${sourceCapture(close)}${escapeRegExp(close)}$`
    );

    const handler: MathJaxRule["handler"] = (state, match, start) => {
        const source = match[1];
        const closeIndex = match[0].length - close.length;
        if (!source.trim() || isEscaped(match.input, closeIndex)) {
            return null;
        }

        const nodeType = state.schema.nodes[blockNodeName];
        const paragraph = state.doc.resolve(start);
        if (!nodeType || !paragraph.parent.isTextblock) {
            return null;
        }

        const container = paragraph.node(paragraph.depth - 1);
        const paragraphIndex = paragraph.index(paragraph.depth - 1);
        if (
            !container.canReplaceWith(
                paragraphIndex,
                paragraphIndex + 1,
                nodeType
            )
        ) {
            return null;
        }

        const blockStart = paragraph.before();
        const blockEnd = paragraph.after();
        const mathNode = nodeType.create({
            source,
            openDelimiter: open,
            closeDelimiter: close,
        });
        const tr = state.tr.replaceWith(blockStart, blockEnd, mathNode);
        const afterMath = blockStart + mathNode.nodeSize;

        if (afterMath === tr.doc.content.size) {
            const trailingParagraph = state.schema.nodes.paragraph.create();
            tr.insert(afterMath, trailingParagraph);
            tr.setSelection(TextSelection.create(tr.doc, afterMath + 1));
        }

        return tr;
    };

    return {
        inputRule: new InputRule(expression, handler, { inCodeMark: false }),
        match: expression,
        handler,
    };
}

/** Build input rules that render completed formulas while the user types. */
export function mathJaxInputRules(options?: MathJaxOptions) {
    return inputRules({
        rules: buildMathJaxRules(options).map((rule) => rule.inputRule),
    });
}

function buildMathJaxRules(options?: MathJaxOptions): MathJaxRule[] {
    const inlineDelimiters =
        options?.inlineDelimiters ?? defaultInlineDelimiters;
    const displayDelimiters =
        options?.displayDelimiters ?? defaultDisplayDelimiters;

    return [
        ...displayDelimiters.map(blockMathInputRule),
        ...inlineDelimiters.map((delimiter) =>
            inlineMathInputRule(delimiter, displayDelimiters)
        ),
    ];
}

/**
 * Apply the same rules after a browser DOM transaction. Some keyboard layouts
 * insert characters such as `$` through DOM reconciliation instead of
 * `handleTextInput`, which bypasses ProseMirror's standard input-rules hook.
 */
export function mathJaxTransactionRules(options?: MathJaxOptions): Plugin {
    const rules = buildMathJaxRules(options);

    return new Plugin({
        appendTransaction: (transactions, _, state) => {
            if (
                !transactions.some((transaction) => transaction.docChanged) ||
                transactions.some((transaction) =>
                    state.plugins.some(
                        (plugin) =>
                            (
                                plugin.spec as {
                                    isInputRules?: boolean;
                                }
                            ).isInputRules && transaction.getMeta(plugin)
                    )
                )
            ) {
                return null;
            }

            const { $cursor } = state.selection as TextSelection;
            if (!$cursor) {
                return null;
            }

            const textBefore = $cursor.parent.textBetween(
                Math.max(0, $cursor.parentOffset - 500),
                $cursor.parentOffset,
                null,
                "\ufffc"
            );

            for (const rule of rules) {
                if (
                    $cursor.parent.type.spec.code ||
                    $cursor.marks().some((mark) => mark.type.spec.code)
                ) {
                    continue;
                }

                const match = rule.match.exec(textBefore);
                if (!match) {
                    continue;
                }

                const start = $cursor.pos - match[0].length;
                let hasCodeMark = false;
                state.doc.nodesBetween(start, $cursor.pos, (node) => {
                    if (
                        node.isInline &&
                        node.marks.some((mark) => mark.type.spec.code)
                    ) {
                        hasCodeMark = true;
                    }
                });
                if (hasCodeMark) {
                    continue;
                }

                const transaction = rule.handler(
                    state,
                    match,
                    start,
                    $cursor.pos
                );
                if (transaction) {
                    return transaction;
                }
            }

            return null;
        },
    });
}
