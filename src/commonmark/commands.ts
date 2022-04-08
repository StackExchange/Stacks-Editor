import { redo, undo } from "prosemirror-history";
import {
    EditorState,
    Plugin,
    TextSelection,
    Transaction,
} from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import {
    addIf,
    createMenuPlugin,
    makeMenuIcon,
    makeMenuLinkEntry,
    makeMenuSpacerEntry,
} from "../shared/menu";
import {
    imageUploaderEnabled,
    showImageUploader,
} from "../shared/prosemirror-plugins/image-upload";
import type { CommonViewOptions } from "../shared/view";
import {
    blockWrapInCommand,
    insertRawText,
    insertRawTextCommand,
    setBlockTypeCommand,
    wrapInCommand,
} from "../utils/commands-commonmark";

/**
 * Inserts a link at the cursor, optionally placing it around the currenly selected text if able
 * @param state The current editor state
 * @param dispatch the dispatch function used to dispatch the transaction, set to "null" if you don't want to dispatch
 */
export function insertLinkCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    // TODO what dummy link to use?
    const dummyLink = "https://www.stackoverflow.com/";

    // TODO what should we select - text or link?
    if (state.selection.empty) {
        return insertRawText(
            "[text](" + dummyLink + ")",
            1,
            5,
            state,
            dispatch
        );
    }

    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to);

    const insertedText = `[${selectedText}](${dummyLink})`;
    //TODO magic numbers!
    const selectFrom = 3 + selectedText.length;
    const selectTo = selectFrom + dummyLink.length;

    // insert the link with the link selected for easy typeover
    return insertRawText(insertedText, selectFrom, selectTo, state, dispatch);
}

/**
 * Inserts a basic table at the cursor
 * @param state The current editor state
 * @param dispatch the dispatch function used to dispatch the transaction, set to "null" if you don't want to dispatch
 */
export function insertTableCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    const tableMarkdown = `
| Column A | Column B |
| -------- | -------- |
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`;
    if (state.selection.empty) {
        return insertRawText(tableMarkdown, 1, 1, state, dispatch);
    }
}

//TODO
function indentBlockCommand(): boolean {
    return false;
}

//TODO
function unIndentBlockCommand(): boolean {
    return false;
}

/**
 * Selects all text in the document's root node, rather than the node itself
 */
export function selectAllTextCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    if (dispatch) {
        let rootNodePos = 0;
        let rootNodeLength = 0;

        // find the root text node's position so we can highlight just it
        state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
            if (node.type.name !== "text") {
                return true;
            }

            rootNodePos = pos;
            rootNodeLength = node.nodeSize;
            return false;
        });

        dispatch(
            state.tr.setSelection(
                TextSelection.create(
                    state.doc,
                    rootNodePos,
                    rootNodePos + rootNodeLength
                )
            )
        );
    }

    return true;
}

export const boldCommand = wrapInCommand("**");
export const emphasisCommand = wrapInCommand("*");
export const inlineCodeCommand = wrapInCommand("`");
export const indentCommand = indentBlockCommand;
export const unindentBlock = unIndentBlockCommand;
export const headerCommand = setBlockTypeCommand("#");
export const strikethroughCommand = wrapInCommand("~~");
export const blockquoteCommand = setBlockTypeCommand(">");
export const orderedListCommand = setBlockTypeCommand("1.");
export const unorderedListCommand = setBlockTypeCommand("-");
export const insertHorizontalRuleCommand = insertRawTextCommand("\n---\n");
export const insertCodeblockCommand = blockWrapInCommand("```");

export function insertImageCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view: EditorView
): boolean {
    if (!imageUploaderEnabled(view)) {
        return false;
    }

    if (!dispatch) return true;

    showImageUploader(view);
    return true;
}

export const createMenu = (options: CommonViewOptions): Plugin =>
    createMenuPlugin(
        [
            {
                key: "toggleHeading",
                command: headerCommand,
                dom: makeMenuIcon("Header", "Heading", "heading-btn"),
            },
            {
                key: "togglBold",
                command: boldCommand,
                dom: makeMenuIcon("Bold", "Bold", "bold-btn"),
            },
            {
                key: "toggleEmphasis",
                command: emphasisCommand,
                dom: makeMenuIcon("Italic", "Italic", "italic-btn"),
            },
            {
                key: "toggleCode",
                command: inlineCodeCommand,
                dom: makeMenuIcon("Code", "Inline code", "code-btn"),
            },
            addIf(
                {
                    key: "toggleStrikethrough",
                    command: strikethroughCommand,
                    dom: makeMenuIcon(
                        "Strikethrough",
                        "Strikethrough",
                        "strike-btn"
                    ),
                },
                options.parserFeatures.extraEmphasis
            ),
            makeMenuSpacerEntry(),
            {
                key: "toggleLink",
                command: insertLinkCommand,
                dom: makeMenuIcon("Link", "Insert link", "insert-link-btn"),
            },
            {
                key: "toggleBlockquote",
                command: blockquoteCommand,
                dom: makeMenuIcon("Quote", "Blockquote", "blockquote-btn"),
            },
            {
                key: "insertCodeblock",
                command: insertCodeblockCommand,
                dom: makeMenuIcon(
                    "Codeblock",
                    "Insert code block",
                    "code-block-btn"
                ),
            },
            addIf(
                {
                    key: "insertImage",
                    command: insertImageCommand,
                    dom: makeMenuIcon(
                        "Image",
                        "Insert image",
                        "insert-image-btn"
                    ),
                },
                !!options.imageUpload?.handler
            ),
            addIf(
                {
                    key: "insertTable",
                    command: insertTableCommand,
                    dom: makeMenuIcon(
                        "Table",
                        "Insert table",
                        "insert-table-btn"
                    ),
                },
                options.parserFeatures.tables
            ),
            makeMenuSpacerEntry(),
            {
                key: "toggleOrderedList",
                command: orderedListCommand,
                dom: makeMenuIcon(
                    "OrderedList",
                    "Numbered list",
                    "numbered-list-btn"
                ),
            },
            {
                key: "toggleUnorderedList",
                command: unorderedListCommand,
                dom: makeMenuIcon(
                    "UnorderedList",
                    "Bulleted list",
                    "bullet-list-btn"
                ),
            },
            {
                key: "insertRule",
                command: insertHorizontalRuleCommand,
                dom: makeMenuIcon(
                    "HorizontalRule",
                    "Insert Horizontal rule",
                    "horizontal-rule-btn"
                ),
            },
            makeMenuSpacerEntry(() => false, ["sm:d-inline-block"]),
            {
                key: "undo",
                command: undo,
                dom: makeMenuIcon("Undo", "Undo", "undo-btn", [
                    "sm:d-inline-block",
                ]),
                visible: () => false,
            },
            {
                key: "redo",
                command: redo,
                dom: makeMenuIcon("Refresh", "Redo", "redo-btn", [
                    "sm:d-inline-block",
                ]),
                visible: () => false,
            },
            makeMenuSpacerEntry(),
            //TODO eventually this will mimic the "help" dropdown in the prod editor
            makeMenuLinkEntry("Help", "Help", options.editorHelpLink),
        ],
        options.menuParentContainer
    );
