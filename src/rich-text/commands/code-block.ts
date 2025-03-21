import { Node as ProseMirrorNode, NodeType, Schema } from "prosemirror-model";
import { EditorState, Transaction, TextSelection } from "prosemirror-state";
import { insertParagraphIfAtDocEnd, safeSetSelection } from "./helpers";
import { toggleMark } from "prosemirror-commands";

// indent code with four [SPACE] characters (hope you aren't a "tabs" person)
const CODE_INDENT_STR = "    ";

/**
 * Indents selected line(s) within a code block
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 * @internal
 */
export function indentCodeBlockLinesCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    const linesToIndent = getCodeBlockLinesWithinSelection(state);
    const lineCount = linesToIndent.length;

    if (lineCount <= 0 || !dispatch) {
        return lineCount > 0;
    }

    let tr = state.tr;
    const { from, to } = state.selection;

    const indentStr = CODE_INDENT_STR;
    const fromIsCodeBlock =
        state.selection.$from.node().type.name === "code_block";

    // indent each line in reverse order so that we don't alter the lines' start positions
    linesToIndent.reverse().forEach((pos) => {
        tr = tr.insertText(indentStr, pos);
    });

    tr.setSelection(
        TextSelection.create(
            state.apply(tr).doc,
            fromIsCodeBlock ? from + indentStr.length : from,
            to + lineCount * indentStr.length
        )
    );

    dispatch(tr);

    return true;
}

/**
 * Unindents selected line(s) within a code block if able
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 * @internal
 */
export function unindentCodeBlockLinesCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    const linesToIndent = getCodeBlockLinesWithinSelection(state);
    const lineCount = linesToIndent.length;

    if (lineCount <= 0 || !dispatch) {
        return lineCount > 0;
    }

    let t = state.tr;
    const { from, to } = state.selection;
    let unindentedLinesCount = 0;
    const indentStr = CODE_INDENT_STR;
    const fromIsCodeBlock =
        state.selection.$from.node().type.name === "code_block";

    linesToIndent.reverse().forEach((pos) => {
        const canUnindent =
            state.doc.textBetween(pos, pos + indentStr.length) === indentStr;

        if (canUnindent) {
            t = t.insertText("", pos, pos + indentStr.length);
            unindentedLinesCount++;
        }
    });

    t.setSelection(
        TextSelection.create(
            state.apply(t).doc,
            fromIsCodeBlock && unindentedLinesCount
                ? from - indentStr.length
                : from,
            to - unindentedLinesCount * indentStr.length
        )
    );

    dispatch(t);

    return true;
}

/**
 * Gets the start position of all lines inside code_block nodes in the current selection
 * @param state The current EditorState
 */
function getCodeBlockLinesWithinSelection(state: EditorState): number[] {
    const { from, to } = state.selection;
    const lineStartIndentPos: number[] = [];

    state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === "code_block") {
            let lineStartPos = pos + 1;
            let lineEndPos;

            node.textContent.split("\n").forEach((line) => {
                lineEndPos = lineStartPos + line.length;
                // Selection overlaps with line
                const selectionIsWithinLine =
                    // Selection is contained entirely within line
                    (from >= lineStartPos && to <= lineEndPos) ||
                    // Line is contained entirely within selection
                    (lineStartPos >= from && lineEndPos <= to) ||
                    // Selection start is within line
                    (from >= lineStartPos && from <= lineEndPos) ||
                    // Selection end is within line
                    (to >= lineStartPos && to <= lineEndPos);

                if (selectionIsWithinLine) {
                    lineStartIndentPos.push(lineStartPos);
                }

                lineStartPos = lineEndPos + 1;
            });
        }
    });

    return lineStartIndentPos;
}

/**
 * Toggle a code block on/off for the selection, merging multiple blocks.
 *
 * - If selection is collapsed, expand it to the entire parent block (so we don't split a paragraph).
 * - If selection covers part or all of multiple blocks, expand to cover those entire blocks.
 * - If every touched block is a code_block, merge them into one paragraph (with `hard_break`).
 * - Otherwise, merge them into a single code block, separating blocks by "\n".
 */
export function toggleCodeBlock() {
    return (
        state: EditorState,
        dispatch?: (tr: Transaction) => void
    ): boolean => {
        if (!dispatch) return true;

        const { schema, doc, selection } = state;
        const { from: originalFrom, to: originalTo } = selection;
        const { code_block, paragraph, hard_break } = schema.nodes as {
            code_block: NodeType;
            paragraph: NodeType;
            hard_break: NodeType;
        };

        // 1) Expand the selection so it covers entire blocks (not partial).
        const { from, to } = expandSelectionToBlockBoundaries(
            doc,
            originalFrom,
            originalTo
        );

        // 2) Check if *all* blocks in [from..to] are code_block
        const allAreCodeBlocks = isAllCodeBlocks(doc, from, to, code_block);

        let tr = state.tr;
        if (allAreCodeBlocks) {
            // Turn this code block into a paragraph
            const codeText = doc.textBetween(from, to, "\n", "\n");
            const paragraphNode = buildParagraphFromText(
                codeText,
                paragraph,
                hard_break,
                schema
            );

            tr = tr.replaceRangeWith(from, to, paragraphNode);

            // Place cursor near the end of that paragraph
            const insertPos = from + paragraphNode.nodeSize - 1;
            tr = safeSetSelection(tr, from, insertPos);
        } else {
            // Turn this paragraph into a code block
            const blockText = gatherTextWithNewlines(doc, from, to, hard_break);

            const codeBlockContent: ProseMirrorNode[] = [];
            if (blockText.length > 0) {
                codeBlockContent.push(schema.text(blockText));
            }

            const codeBlockNode = code_block.create(null, codeBlockContent);
            tr = tr.replaceRangeWith(from, to, codeBlockNode);

            // Place cursor near end of code block
            const insertPos = from + codeBlockNode.nodeSize - 1;
            tr = safeSetSelection(tr, from, insertPos);

            // If we're at the end of the document, add an empty paragraph underneath
            tr = insertParagraphIfAtDocEnd(tr);
        }

        dispatch(tr.scrollIntoView());
        return true;
    };
}

/**
 * Expand [from..to] so that it covers the *entire* blocks that the selection touches.
 * In other words, if the user partially selected some text in a block, we extend
 * from..to to include the entire block node(s).
 *
 * @param doc The top-level document node
 * @param from The original selection start
 * @param to The original selection end
 * @returns An object with adjusted `from` and `to`.
 */
function expandSelectionToBlockBoundaries(
    doc: ProseMirrorNode,
    from: number,
    to: number
) {
    // If the selection is already covering multiple blocks or partially inside,
    // we gather the minimal blockStart of all touched blocks, and the maximal blockEnd.

    let blockStart = from;
    let blockEnd = to;

    doc.nodesBetween(from, to, (node, pos) => {
        if (node.isBlock) {
            const startPos = pos; // where the block node starts
            const endPos = pos + node.nodeSize; // block node ends after nodeSize
            if (startPos < blockStart) {
                blockStart = startPos;
            }
            if (endPos > blockEnd) {
                blockEnd = endPos;
            }
        }
    });

    // If selection is collapsed or we found no blocks, we still do the "parent block" approach
    if (blockStart === blockEnd) {
        // The selection might be in the middle of a block. We'll expand to that entire block
        const $from = doc.resolve(from);
        blockStart = $from.start($from.depth);
        blockEnd = blockStart + $from.parent.nodeSize;
    }

    // Subtract 1 from blockEnd to avoid counting the block node's boundary beyond content
    return { from: blockStart, to: blockEnd - 1 };
}

/**
 * Returns true if EVERY block node within [from..to] is a `code_block`.
 */
function isAllCodeBlocks(
    doc: ProseMirrorNode,
    from: number,
    to: number,
    codeBlockType: NodeType
): boolean {
    let allCode = true;
    doc.nodesBetween(from, to, (node) => {
        if (node.isBlock && node.type !== codeBlockType) {
            allCode = false;
            return false; // stop traversing deeper
        }
        return true;
    });
    return allCode;
}

/**
 * Convert [from..to] to multiline text, turning block boundaries/hard_break => "\n".
 */
function gatherTextWithNewlines(
    doc: ProseMirrorNode,
    from: number,
    to: number,
    hardBreakType: NodeType
): string {
    let text = "";
    let prevBlockPos = -1;

    doc.nodesBetween(from, to, (node, pos) => {
        if (node.isBlock && pos >= from && pos > prevBlockPos && pos > from) {
            text += "\n";
            prevBlockPos = pos;
        }
        if (node.isText) {
            text += node.text;
        } else if (node.type === hardBreakType) {
            text += "\n";
        }
    });

    return text;
}

/**
 * Build a single paragraph node from `codeText` by splitting on "\n"
 * and inserting `hard_break` for line breaks.
 */
function buildParagraphFromText(
    codeText: string,
    paragraphType: NodeType,
    hardBreakType: NodeType,
    schema: Schema
): ProseMirrorNode {
    const lines = codeText.split("\n");
    const paragraphContent: ProseMirrorNode[] = [];
    lines.forEach((line, index) => {
        if (line.length > 0) {
            paragraphContent.push(schema.text(line));
        }
        if (index < lines.length - 1) {
            paragraphContent.push(hardBreakType.create());
        }
    });

    return paragraphType.create(null, paragraphContent);
}

export function toggleInlineCode(
    state: EditorState,
    dispatch?: (tr: Transaction) => void
): boolean {
    // If the selection contains linebreaks, disable the "inline code" button - users should use code blocks instead.

    const { from, to } = state.selection;

    // Check for actual newline characters in the text.
    const selectedText = state.doc.textBetween(from, to, "\n", "\n");
    if (selectedText.includes("\n")) {
        return false;
    }

    // Check for 'softbreak' nodes within the selection. These can appear when pasting text with linebreaks in Markdown mode.
    let containsSoftBreak = false;
    state.doc.nodesBetween(from, to, (node) => {
        if (node.type.name === "softbreak") {
            containsSoftBreak = true;
            // Return false to stop traversing deeper into this node's children.
            return false;
        }
        return true;
    });

    if (containsSoftBreak) {
        return false;
    }

    // If we found neither newline nor softbreak, toggle the inline code mark.
    return toggleMark(state.schema.marks.code)(state, dispatch);
}
