import { setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import {
    Mark,
    MarkType,
    NodeType,
    Schema,
    Node as PMNode
} from "prosemirror-model";
import {
    Command,
    EditorState,
    TextSelection,
    Transaction,
    Selection
} from "prosemirror-state";
import { liftTarget } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import {
    imageUploaderEnabled,
    showImageUploader,
} from "../../shared/prosemirror-plugins/image-upload";
import { getCurrentTextNode } from "../../shared/utils";
import type { TagLinkOptions } from "../../shared/view";
import { showLinkEditor } from "../plugins/link-editor";
import { insertParagraphIfAtDocEnd, safeSetSelection } from "./helpers";
import { inTable } from "./tables";

export * from "./tables";
export * from "./list";

// indent code with four [SPACE] characters (hope you aren't a "tabs" person)
const CODE_INDENT_STR = "    ";

/**
 * Builds a command which wraps/unwraps the current selection with the passed in node type
 * @param nodeType the type of node to wrap the selection in
 * @returns A command to toggle the wrapper node
 * Commands are functions that take a state and an optional
 * transaction dispatch function and...
 *
 *  - determine whether they apply to this state
 *  - if not, return false
 *  - if `dispatch` was passed, perform their effect, possibly by
 *    passing a transaction to `dispatch`
 *  - return true
 */
export function toggleWrapIn(nodeType: NodeType): Command {
    const nodeCheck = nodeTypeActive(nodeType);
    const wrapInCommand = wrapIn(nodeType);

    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        // if the node is not wrapped, go ahead and wrap it
        if (!nodeCheck(state)) {
            return wrapInCommand(state, dispatch);
        }

        const { $from, $to } = state.selection;
        const range = $from.blockRange($to);

        // check if there is a valid target to lift to
        const target = range && liftTarget(range);

        // if we cannot unwrap, return false
        if (target == null) {
            return false;
        }

        if (dispatch) {
            dispatch(state.tr.lift(range, target));
        }

        return true;
    };
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

/**
 * Creates a command that toggles heading and cycles through heading levels
 * @param attrs? A key-value map of attributes that must be present on this node for it to be toggled off
 * @internal
 */
export function toggleHeadingLevel(attrs?: { [key: string]: unknown }) {
    return (state: EditorState, dispatch: (tr: Transaction) => void) => {
        const nodeType = state.schema.nodes.heading;
        const nodeCheck = nodeTypeActive(nodeType, attrs);
        const headingLevel = getHeadingLevel(state);

        // if the node is a heading and is either level 6 or matches the current level, toggle it off
        if (
            nodeCheck(state) &&
            (headingLevel === 6 || headingLevel === attrs?.level)
        ) {
            return setBlockType(state.schema.nodes.paragraph)(state, dispatch);
        }

        const updatedAttrs = !attrs?.level
            ? { ...attrs, level: headingLevel + 1 }
            : attrs;
        const setBlockTypeCommand = setBlockType(nodeType, updatedAttrs);
        return setBlockTypeCommand(state, (t) => {
            if (dispatch) {
                // when adding a block node, make sure the user can navigate past it
                dispatch(insertParagraphIfAtDocEnd(t));
            }
        });
    };
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
 * Returns the first heading level of the current selection
 * @param state The current editor state
 */
function getHeadingLevel(state: EditorState): number {
    const { from, to } = state.selection;
    let level = 0;
    state.doc.nodesBetween(from, to, (node) => {
        if (node.type.name === "heading") {
            level = node.attrs.level as number;
            return true;
        }
    });

    return level;
}

/**
 * Creates a command that toggles tagLink formatting for a node
 * @param options The passed TagLinkOptions
 * @param isMetaTag Whether the tag to be created is a meta tag or not
 */
export function toggleTagLinkCommand(
    options: TagLinkOptions,
    isMetaTag: boolean
) {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        if (options.disableMetaTags && isMetaTag) {
            return false;
        }

        if (state.selection.empty) {
            return false;
        }

        if (!isValidTagLinkTarget(state.schema, state.selection)) {
            return false;
        }

        if (!dispatch) {
            return true;
        }

        let tr = state.tr;
        const nodeCheck = nodeTypeActive(state.schema.nodes.tagLink);
        if (nodeCheck(state)) {
            const selectedText = state.selection.content().content.firstChild
                .attrs["tagName"] as string;

            tr = state.tr.replaceSelectionWith(state.schema.text(selectedText));
        } else {
            const selectedText =
                state.selection.content().content.firstChild?.textContent;

            // If we have a trailing space, update the selection to not include it.
            if (selectedText.endsWith(" ")) {
                const { from, to } = state.selection;
                state.selection = TextSelection.create(state.doc, from, to - 1);
            }

            if (!options.validate(selectedText.trim(), isMetaTag)) {
                return false;
            }

            const newTagNode = state.schema.nodes.tagLink.create({
                tagName: selectedText.trim(),
                tagType: isMetaTag ? "meta-tag" : "tag",
            });

            tr = state.tr.replaceSelectionWith(newTagNode);
        }

        dispatch(tr);

        return true;
    };
}

/**
 * Validates whether the target of our selection is within a valid context. e.g. not in a link
 * @param schema Current editor schema
 * @param selection Current selection handle
 */
function isValidTagLinkTarget(schema: Schema, selection: Selection): boolean {
    const invalidNodeTypes = [
        schema.nodes.horizontal_rule,
        schema.nodes.code_block,
        schema.nodes.image,
    ];

    const invalidNodeMarks = [schema.marks.link, schema.marks.code];

    const hasInvalidMark =
        selection.$head.marks().filter((f) => invalidNodeMarks.includes(f.type))
            .length != 0;

    return (
        !invalidNodeTypes.includes(selection.$head.parent.type) &&
        !hasInvalidMark
    );
}

/**
 * Creates a command that inserts a horizontal rule node
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 */
export function insertRichTextHorizontalRuleCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    if (inTable(state.schema, state.selection)) {
        return false;
    }

    if (!dispatch) {
        return true;
    }

    const isAtEnd =
        state.doc.content.size - 1 ===
        Math.max(state.selection.from, state.selection.to);
    const isAtBeginning = state.tr.selection.from === 1;

    let tr = state.tr.replaceSelectionWith(
        state.schema.nodes.horizontal_rule.create()
    );

    if (isAtBeginning) {
        tr = tr.insert(0, state.schema.nodes.paragraph.create());
    }

    if (isAtEnd) {
        tr = tr.insert(tr.selection.to, state.schema.nodes.paragraph.create());
    }

    dispatch(tr);
    return true;
}

/**
 * Opens the image uploader pane
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 * @param view The current editor view
 */
export function insertRichTextImageCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view: EditorView
): boolean {
    if (!imageUploaderEnabled(view.state)) {
        return false;
    }

    if (!dispatch) return true;

    showImageUploader(view);
    return true;
}

/**
 * Inserts a link into the document and opens the link edit tooltip at the cursor
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 * @param view The current editor view
 */
export function insertRichTextLinkCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view: EditorView
): boolean {
    // never actually toggle the mark, as that is done in the link editor
    // we do want to *pretend* to, as toggleMark checks for validity
    const valid = toggleMark(state.schema.marks.link, { href: null })(
        state,
        null
    );

    if (dispatch && valid) {
        let selectedText: string;
        let linkUrl: string;

        const $anchor = state.selection.$anchor;
        // if selection is empty, but inside link mark, use the link url/text from it
        if (state.selection.empty && $anchor.textOffset) {
            const currentTextNode = getCurrentTextNode(state);
            const mark = currentTextNode.marks.find(
                (m) => m.type === state.schema.marks.link
            );
            if (mark) {
                selectedText = currentTextNode.text;
                linkUrl = mark.attrs.href as string;

                // expand the selection so we're editing the entire link
                const pos = $anchor.pos;
                dispatch(
                    state.tr.setSelection(
                        TextSelection.create(
                            state.doc,
                            pos - $anchor.textOffset,
                            pos - $anchor.textOffset + selectedText.length
                        )
                    )
                );
            }
        } else {
            selectedText =
                state.selection.content().content.firstChild?.textContent ??
                null;
            const linkMatch = /^http(s)?:\/\/\S+$/.exec(selectedText);
            linkUrl = linkMatch?.length > 0 ? linkMatch[0] : "";
        }

        showLinkEditor(view, linkUrl, selectedText);
    }

    return valid;
}

/**
 * Creates an `active` method that returns true if the current selection is/contained in the current block type
 * @param nodeType The type of the node to check for
 * @param attrs? A key-value map of attributes that must be present on this node
 * @internal TODO TESTS
 */
export function nodeTypeActive(
    nodeType: NodeType,
    attrs?: { [key: string]: unknown }
) {
    return function (state: EditorState) {
        const { from, to } = state.selection;
        let isNodeType = false;
        let passesAttrsCheck = !attrs;

        // check all nodes in the selection for the right type
        state.doc.nodesBetween(from, to, (node) => {
            isNodeType = node.type.name === nodeType.name;
            for (const attr in attrs) {
                passesAttrsCheck = node.attrs[attr] === attrs[attr];
            }

            // stop recursing if the current node is the right type
            return !(isNodeType && passesAttrsCheck);
        });

        return isNodeType && passesAttrsCheck;
    };
}

/**
 * Creates an `active` method that returns true of the current selection has the passed mark
 * @param mark The mark to check for
 * @internal TODO TESTS
 */
export function markActive(mark: MarkType) {
    return function (state: EditorState) {
        const { from, $from, to, empty } = state.selection;
        if (empty) {
            return !!mark.isInSet(state.storedMarks || $from.marks());
        } else {
            return state.doc.rangeHasMark(from, to, mark);
        }
    };
}

/**
 * Exits an inclusive mark that has been marked as exitable by toggling the mark type
 * and optionally adding a trailing space if the mark is at the end of the document
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 */
export function exitInclusiveMarkCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    const $cursor = (<TextSelection>state.selection).$cursor;
    const marks = state.storedMarks || $cursor.marks();

    if (!marks?.length) {
        return false;
    }

    // check if the current mark is exitable
    const exitables = marks.filter((mark) => mark.type.spec.exitable);

    if (!exitables?.length) {
        return false;
    }

    // check if we're at the end of the exitable mark
    const nextNode = $cursor.nodeAfter;
    let endExitables: Mark[];

    let tr = state.tr;

    if (nextNode && nextNode.marks?.length) {
        // marks might be nested, so check each mark
        endExitables = exitables.filter(
            (mark) => !mark.type.isInSet(nextNode.marks)
        );
    } else {
        // no next node, so *all* marks are exitable
        endExitables = exitables;
    }

    if (!endExitables.length) {
        return false;
    }

    if (dispatch) {
        // remove the exitable marks from the cursor
        endExitables.forEach((e) => {
            tr = tr.removeStoredMark(e);
        });

        // if there's no characters to the right of the cursor, add a space
        if (!nextNode) {
            tr = tr.insertText(" ");
        }

        dispatch(tr);
    }

    return true;
}
