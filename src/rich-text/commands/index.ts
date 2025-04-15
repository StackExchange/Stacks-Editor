import {
    setBlockType,
    splitBlock,
    toggleMark,
    wrapIn,
} from "prosemirror-commands";
import { Mark, MarkType, NodeType, Schema } from "prosemirror-model";
import {
    Command,
    EditorState,
    TextSelection,
    Transaction,
    Selection,
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
import { insertParagraphIfAtDocEnd } from "./helpers";
import { inTable } from "./tables";

export * from "./tables";
export * from "./list";
export * from "./code-block";

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
    const marks = state.storedMarks || $cursor?.marks();

    if (!marks?.length) {
        return false;
    }

    // check if the current mark is exitable
    const exitables = marks.filter((mark) => mark.type.spec.exitable);

    if (!exitables?.length) {
        return false;
    }

    // check if we're at the end of the exitable mark
    const nextNode = $cursor?.nodeAfter;
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

/**
 * Ensure there's a next block to move into - Adds an additional blank paragraph block
 *  if the next node available is unselectable and there is no node afterwards that is selectable.
 * */
export function escapeUnselectableCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    //A resolved position of the cursor. Functionally: The place we're calculating the next line for.
    const selectionEndPos = state.selection.$to;

    //If you're already at the end of the document, do the default action (nothing)
    // Note: We're checking for either the last Inline character or the last node being selected here.
    const isLastNode = state.doc.lastChild.eq(state.selection.$to.parent);
    const isSelectingWholeDoc = state.doc.eq(state.selection.$to.parent);
    if (isLastNode || isSelectingWholeDoc) {
        return false;
    }

    //Calculate the position starting at the next line in the doc (the start point to check at)
    const findStartPos = selectionEndPos.posAtIndex(
        selectionEndPos.indexAfter(0),
        0
    );

    //Starting from the next node position down, check all the nodes for being a text block.
    let foundSelectable: boolean = false;
    state.doc.nodesBetween(findStartPos, state.doc.content.size, (node) => {
        //Already found one, no need to delve deeper.
        if (foundSelectable) return !foundSelectable;

        //We found one!
        if (node.isTextblock) {
            foundSelectable = true;
            return false;
        }

        //We didn't find something selectable, so keep iterating, and dig into the children while we're at it.
        return true;
    });

    //If there's not something to move into, add it now
    if (!foundSelectable) {
        dispatch(
            state.tr.insert(
                state.doc.content.size,
                state.schema.nodes.paragraph.create()
            )
        );
    }

    //No matter what, we want the default behaviour to take over from here.
    // Either we've created a new line to edit into just in time, or there was already something for it to move to
    return false;
}

export function splitCodeBlockAtStartOfDoc(
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    const { $from } = state.selection;
    const parent = $from.parent;

    if (parent.type.name !== "code_block") {
        return false;
    }

    if ($from.parentOffset !== 0) {
        return false;
    }

    // Is this code block the first child of the doc (i.e. no other nodes above it)?
    if ($from.depth !== 1 || $from.index(0) !== 0) {
        return false;
    }

    return splitBlock(state, dispatch);
}

function isSelectionInCodeBlock(
    state: EditorState
): { pos: number; node: any } | null {
    const { $from } = state.selection;
    if ($from.parent.type.name === "code_block") {
        return { pos: $from.before(), node: $from.parent };
    }
    return null;
}

// Command to open the language dropdown.
export function openCodeBlockLanguagePicker(
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    const codeBlock = isSelectionInCodeBlock(state);
    if (!codeBlock) {
        return false;
    }
    const { pos, node } = codeBlock;
    // Update the node attributes to trigger the language input.
    const newAttrs = { ...node.attrs, isEditingLanguage: true };
    if (dispatch) {
        dispatch(state.tr.setNodeMarkup(pos, undefined, newAttrs));
    }
    return true;
}
