import { Node as PMNode, NodeType } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { safeSetSelection } from "./helpers";

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
        let { from, to } = expandSelectionToBlockBoundaries(
            doc,
            originalFrom,
            originalTo
        );

        // 2) Check if *all* blocks in [from..to] are code_block
        const allAreCodeBlocks = isAllCodeBlocks(doc, from, to, code_block);

        let tr = state.tr;
        if (allAreCodeBlocks) {
            // --- Toggle OUT of code blocks => single paragraph ---
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
            // --- Toggle INTO code block => single code block ---
            const blockText = gatherTextWithNewlines(doc, from, to, hard_break);

            const codeBlockContent: PMNode[] = [];
            if (blockText.length > 0) {
                codeBlockContent.push(schema.text(blockText));
            }

            const codeBlockNode = code_block.create(null, codeBlockContent);
            tr = tr.replaceRangeWith(from, to, codeBlockNode);

            // Place cursor near end of code block
            const insertPos = from + codeBlockNode.nodeSize - 1;
            tr = safeSetSelection(tr, from, insertPos);
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
    doc: PMNode,
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
    // Usually, we do -2 for open-close tokens, but to keep it consistent with replaceRangeWith,
    // let's do blockEnd - 1 or blockEnd - 2. Let's see:
    // Actually, we typically do: blockStart + node.nodeSize - 2 for one block.
    // But here, multiple blocks might be considered. We'll do -1 so we replace the entire node.
    return { from: blockStart, to: blockEnd - 1 };
}

/**
 * Returns true if EVERY block node within [from..to] is a `code_block`.
 */
function isAllCodeBlocks(
    doc: PMNode,
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
    doc: PMNode,
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
    schema: any
): PMNode {
    const lines = codeText.split("\n");
    const paragraphContent: PMNode[] = [];
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
