import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import {
    makeMenuIcon,
    makeMenuLinkEntry,
    makeMenuSpacerEntry,
    addIf,
    MenuCommand,
    MenuCommandEntry,
} from "../shared/menu";
import { EditorView } from "prosemirror-view";
import {
    imageUploaderEnabled,
    showImageUploader,
} from "../shared/prosemirror-plugins/image-upload";
import type { CommonViewOptions } from "../shared/view";
import { getShortcut } from "../shared/utils";
import { Schema } from "prosemirror-model";
import { undo, redo } from "prosemirror-history";

/**
 * Shortcut binding that takes in a formatting string and returns a matching setBlockType command
 * @param formattingText
 */
export const setBlockTypeCommand = (formattingText: string): MenuCommand =>
    <MenuCommand>setBlockType.bind(null, formattingText);

/**
 * Shortcut binding that takes in a formatting string and returns a matching wrapIn command
 * @param formattingText
 */
export const wrapInCommand = (formattingText: string): MenuCommand =>
    <MenuCommand>toggleWrapIn.bind(null, formattingText);

export const blockWrapInCommand = (formattingText: string): MenuCommand =>
    <MenuCommand>toggleBlockWrap.bind(null, formattingText);

export const insertRawTextCommand = (
    text: string,
    selectFrom?: number,
    selectTo?: number
): MenuCommand =>
    <MenuCommand>insertRawText.bind(null, text, selectFrom, selectTo);

const newTextNode = (schema: Schema, content: string) => schema.text(content);

/**
 * Toggles wrapping selected text in the formatting string; adds newly wrapped text if nothing is selected
 * @param formattingText The text to wrap the currently selected text in
 * @param state The current editor state
 * @param dispatch The dispatch function used to trigger the transaction, set to "null" if you don't want to dispatch
 */
function toggleWrapIn(
    formattingText: string,
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    // check if we're unwrapping first
    if (unwrapIn(formattingText, state, dispatch)) {
        return true;
    }

    return wrapIn(formattingText, state, dispatch);
}

/**
 * Wraps the currently selected text with the passed text, creating new text if nothing is selected
 * @param formattingText The text to wrap the currently selected text in
 * @param state The current editor state
 * @param dispatch The dispatch function used to trigger the transaction, set to "null" if you don't want to dispatch
 */
function wrapIn(
    formattingText: string,
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    const textToInsertOnEmptySelection = "your text";

    const { from, to } = state.selection;

    const tr = state.tr.insertText(formattingText, to);

    if (state.selection.empty) {
        tr.insertText(textToInsertOnEmptySelection, to);
    }

    tr.insertText(formattingText, from).scrollIntoView();

    if (dispatch) {
        let selectionStart = from;
        // add the format length twice to adjust for the characters added before *and* after the text
        let selectionEnd = to + formattingText.length * 2;

        // if the selection was empty, just select the newly added text
        // and *not* the formatting so the user can start typing over it immediately
        if (state.selection.empty) {
            selectionStart = from + formattingText.length;
            selectionEnd = selectionStart + textToInsertOnEmptySelection.length;
        }

        // set the selection to include our newly added characters
        tr.setSelection(
            TextSelection.create(
                state.apply(tr).doc,
                selectionStart,
                selectionEnd
            )
        );
        dispatch(tr);
    }

    return true;
}

/**
 * Unwraps the currently selected text if it is already wrapped in the passed text
 * @param formattingText The text to wrap the currently selected text in
 * @param state The current editor state
 * @param dispatch The dispatch function used to trigger the transaction, set to "null" if you don't want to dispatch
 */
function unwrapIn(
    formattingText: string,
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    // if the selection is empty, then there is nothing to unwrap
    if (state.selection.empty) {
        return false;
    }

    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to);

    const precedingString = selectedText.slice(0, formattingText.length);
    const postcedingString = selectedText.slice(formattingText.length * -1);

    if (
        precedingString !== formattingText ||
        postcedingString !== formattingText
    ) {
        return false;
    }

    if (dispatch) {
        const tr = state.tr;

        // unwrap the text and set into the document
        const unwrappedText = selectedText.slice(
            formattingText.length,
            formattingText.length * -1
        );
        tr.replaceSelectionWith(newTextNode(tr.doc.type.schema, unwrappedText));

        // set the selected text to the unwrapped text
        tr.setSelection(
            TextSelection.create(
                state.apply(tr).doc,
                from,
                to - formattingText.length * 2
            )
        );

        dispatch(tr);
    }

    return true;
}

/**
 * Sets/unsets the block type of either selected (set for just the selection) or unselected (set at the beginning of the line) text
 * @param formattingText The text to prepend to the currently selected block
 * @param state The current editor state
 * @param dispatch the dispatch function used to dispatch the transaction, set to "null" if you don't want to dispatch
 */
function setBlockType(
    formattingText: string,
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    // check first if we are toggling this entire block or toggling just the selected content
    if (setMultilineSelectedBlockType(formattingText, state, dispatch)) {
        return true;
    }

    return setSingleLineBlockType(formattingText, state, dispatch);
}

/**
 * Returns any block formatting characters (plus trailing space) at the very start of the passed text
 * @param text The text to check for leading block characters
 * @internal
 */
export function matchLeadingBlockCharacters(text: string) {
    // TODO this might be too aggressive... remove based on a whitelist instead?
    // Match ordered list markers; see https://spec.commonmark.org/0.30/#ordered-list-marker
    let match = /^(\d+)(?:\.|\))\s/.exec(text)?.[0];

    // If text is not an ordered list block, check for other block types
    if (!match) {
        // TODO HACK assumes all non-ordered list block types are non-letter characters followed by a single space
        match = /^[^a-zA-Z0-9]+\s{1}(?=[a-zA-Z0-9_*[!]|$)+/.exec(text)?.[0];
    }

    return match || "";
}

/**
 * Places/removes the passed text at the very beginning of the text block the selection exists in,
 * potentially removing other block text to do so
 * @param formattingText The text to prepend to the currently selected block
 * @param state The current editor state
 * @param dispatch the dispatch function used to dispatch the transaction, set to "null" if you don't want to dispatch
 */
function setSingleLineBlockType(
    formattingText: string,
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    // get the "from" position of the cursor/selection only
    const { from } = state.selection as TextSelection;

    // get all text from the start of the doc to our cursor
    const textToCursor = state.doc.cut(0, from).textContent;

    // doc position is index differently (0 vs 1 indexed), so offset
    const stateOffset = 1;

    // look backwards for the most recent newline char
    const prevNewlineIndex = textToCursor.lastIndexOf("\n");

    // store where we're inserting our text; this will be our working point from now on
    let textInsertPos: number;

    // if there is no newline, set to beginning of doc
    if (prevNewlineIndex === -1) {
        textInsertPos = stateOffset;
    } else {
        // otherwise, set based on the index
        textInsertPos = prevNewlineIndex + stateOffset + "\n".length;
    }

    // always trail the formatting text with an empty space
    const trailingText = " ";

    // get all text starting from our insert point to check if we're toggling on/off
    const textFromInsert = state.doc.cut(textInsertPos).textContent;

    // check if *any* block type is already set
    const leadingBlockChars = matchLeadingBlockCharacters(textFromInsert);

    let tr = state.tr;

    if (leadingBlockChars.length) {
        // remove all leading block chars
        tr = tr.delete(textInsertPos, textInsertPos + leadingBlockChars.length);
    }

    let isTogglingOff = false;

    // check if the text at that index is already set to our formatting text
    if (leadingBlockChars === formattingText + trailingText) {
        isTogglingOff = true;
    }

    if (!isTogglingOff) {
        // add the formatting text
        tr = tr.insertText(formattingText + trailingText, textInsertPos);
    }

    if (dispatch) {
        tr = tr.scrollIntoView();
        dispatch(tr);
    }

    return true;
}

/**
 * Places/removes the passed text at the very beginning of each selected text line, creating a preceding newline if necessary
 * @param formattingText The text to prepend to the currently selected block
 * @param state The current editor state
 * @param dispatch the dispatch function used to dispatch the transaction, set to "null" if you don't want to dispatch
 */
function setMultilineSelectedBlockType(
    formattingText: string,
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    // if the selection is empty, then this command is not valid
    if (state.selection.empty) {
        return false;
    }

    let { from } = state.selection;
    const selectedText = state.doc.cut(from, state.selection.to).textContent;

    // if there are no line breaks inside this text, then treat it as if we're editing the whole block
    if (!selectedText.includes("\n")) {
        return false;
    }

    // always trail the formatting text with a space
    const trailingText = " ";

    let tr = state.tr;

    // check the very first character on each line
    // if even a single line is missing, toggle all missing ON, else toggle all OFF
    const lines = selectedText.split("\n");
    const isTogglingOn = lines.some(
        (text) => !text.startsWith(formattingText + trailingText)
    );

    // doc position is index differently (0 vs 1 indexed), so offset
    const stateOffset = 1;

    let rangeFrom = from;
    lines.forEach((l) => {
        let formattedLine: string;

        const leadingBlockChars = matchLeadingBlockCharacters(l);
        const beginsWithText =
            leadingBlockChars === formattingText + trailingText;

        if (isTogglingOn && beginsWithText) {
            // toggling on and already begins with text... leave it
            formattedLine = l;
        } else if (isTogglingOn && leadingBlockChars.length) {
            // toggling on and another block is there... replace
            formattedLine =
                formattingText +
                trailingText +
                l.slice(leadingBlockChars.length);
        } else if (isTogglingOn) {
            // toggling on and nothing is there... just add
            formattedLine = formattingText + trailingText + l;
        } else {
            // toggling off... remove whatever leading block chars are there
            formattedLine = l.slice(leadingBlockChars.length);
        }

        const rangeTo = rangeFrom + l.length;

        // we can't set an empty text node, so if the line is empty, just delete the text instead
        if (formattedLine.length) {
            tr = tr.replaceRangeWith(
                rangeFrom,
                rangeTo,
                newTextNode(tr.doc.type.schema, formattedLine)
            );
        } else {
            tr = tr.deleteRange(rangeFrom, rangeTo);
        }

        // set the start of the next line to the altered line's length + 1 character for the removed (by .split) newline char
        rangeFrom += formattedLine.length + "\n".length;
    });

    // if the character immediately preceding the selection isn't a newline, add one
    if (
        from > stateOffset &&
        state.doc.textBetween(from - stateOffset, from) !== "\n"
    ) {
        tr = tr.insertText("\n", from, from);
        from += "\n".length;
        rangeFrom += "\n".length;
    }

    if (dispatch) {
        // the end of the selection is the calculated "rangeFrom", which includes all our added/removed chars
        // subtract a single \n's length from the end that is overadjusted in the calculation (for splitting on \n)
        const selectionEnd = rangeFrom - "\n".length;

        tr.setSelection(
            TextSelection.create(state.apply(tr).doc, from, selectionEnd)
        );

        tr.scrollIntoView();

        dispatch(tr);
    }

    return true;
}

//TODO document
function toggleBlockWrap(
    formattingText: string,
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    // check if we're unwrapping first
    if (blockUnwrapIn(formattingText, state, dispatch)) {
        return true;
    }

    return blockWrapIn(formattingText, state, dispatch);
}

/**
 * Wraps/unwraps a multiline block in the given formatting text, adding newlines before and after the selection if necessary
 * @param formattingText The text to wrap/unwrap the currently selected block in
 * @param state The current editor state
 * @param dispatch the dispatch function used to dispatch the transaction, set to "null" if you don't want to dispatch
 */
function blockWrapIn(
    formattingText: string,
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    // empty selection, not valid
    if (state.selection.empty) {
        const placeholderText = "type here";
        const insertedBlock = `\n${formattingText}\n${placeholderText}\n${formattingText}\n`;
        const newlineOffset = 2; // account for  two inserted newlines
        return insertRawText(
            insertedBlock,
            formattingText.length + newlineOffset,
            formattingText.length + placeholderText.length + newlineOffset,
            state,
            dispatch
        );
    }

    let { from, to } = state.selection;

    // check if we need to unwrap
    if (blockUnwrapIn(formattingText, state, dispatch)) {
        return true;
    }

    // wrap the selected block in code fences, prepending/appending newlines if necessary
    let tr = state.tr;

    // if the character immediately preceding the selection isn't a newline, add one
    if (from > 0 && state.doc.textBetween(from - 1, from) !== "\n") {
        tr = tr.insertText("\n", from, from);
        from += 1;
        to += 1;
    }

    // if the character immediately postceding the selection isn't a newline, add one
    if (
        to + 1 < state.doc.content.size &&
        state.doc.textBetween(to, to + 1) !== "\n"
    ) {
        tr = tr.insertText("\n", to + 1, to + 1);
        to += 1;
    }

    // add this char before and after the selection along with the formatting text
    const surroundingChar = "\n";

    // insert the code fences from the end first so we don't mess up our from index
    tr.insertText(surroundingChar + formattingText, to);
    tr.insertText(formattingText + surroundingChar, from);

    if (dispatch) {
        // adjust our new text selection based on how many characters we added
        const addedTextModifier =
            surroundingChar.length + formattingText.length;

        tr.setSelection(
            TextSelection.create(
                state.apply(tr).doc,
                from,
                // add modifier twice, once for added leading text, once for added trailing text
                to + addedTextModifier * 2
            )
        );

        tr.scrollIntoView();

        dispatch(tr);
    }

    return true;
}

/**
 * Unwraps a multiline block in the given formatting text if able
 * @param formattingText The text to unwrap from currently selected block
 * @param state The current editor state
 * @param dispatch the dispatch function used to dispatch the transaction, set to "null" if you don't want to dispatch
 */
function blockUnwrapIn(
    formattingText: string,
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    // no selection, not valid
    if (state.selection.empty) {
        return false;
    }

    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to);

    const surroundingChar = "\n";
    const totalFormattedLength = formattingText.length + surroundingChar.length;

    const precedingString = selectedText.slice(0, totalFormattedLength);
    const postcedingString = selectedText.slice(totalFormattedLength * -1);

    if (
        precedingString !== formattingText + surroundingChar ||
        postcedingString !== surroundingChar + formattingText
    ) {
        return false;
    }

    let tr = state.tr;

    // remove our wrapping chars, starting with the trailing text so we don't disturb the from index
    tr = tr.delete(to - totalFormattedLength, to);
    tr = tr.delete(from, from + totalFormattedLength);

    if (dispatch) {
        tr.setSelection(
            TextSelection.create(
                state.apply(tr).doc,
                from,
                // add modifier twice, once for added leading text, once for added trailing text
                to - totalFormattedLength * 2
            )
        );

        tr.scrollIntoView();

        dispatch(tr);
    }

    return true;
}

/**
 * Inserts the given text at the cursor, replacing selected text if applicable
 * @param text The text to insert
 * @param state The current editor state
 * @param dispatch the dispatch function used to dispatch the transaction, set to "null" if you don't want to dispatch
 */
function insertRawText(
    text: string,
    selectFrom: number,
    selectTo: number,
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    let tr = state.tr;

    const { from } = state.selection;

    if (state.selection.empty) {
        tr = tr.insertText(text, from);
    } else {
        tr = tr.replaceSelectionWith(newTextNode(tr.doc.type.schema, text));
    }

    if (dispatch) {
        // if the select range is declared, select the specified range in the added text
        if (
            typeof selectFrom !== "undefined" &&
            typeof selectTo !== "undefined"
        ) {
            tr = tr.setSelection(
                TextSelection.create(
                    state.apply(tr).doc,
                    from + selectFrom,
                    from + selectTo
                )
            );
        } else {
            // if the range is NOT declared, set the cursor to before the inserted text
            tr = tr.setSelection(
                TextSelection.create(state.apply(tr).doc, from)
            );
        }

        tr = tr.scrollIntoView();
        dispatch(tr);
    }

    return true;
}

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

export const createMenuEntries = (
    options: CommonViewOptions
): MenuCommandEntry[] => [
    {
        key: "toggleHeading",
        command: headerCommand,
        dom: makeMenuIcon(
            "Header",
            `Heading (${getShortcut("Mod-h")})`,
            "heading-btn"
        ),
    },
    {
        key: "togglBold",
        command: boldCommand,
        dom: makeMenuIcon("Bold", `Bold (${getShortcut("Mod-b")})`, "bold-btn"),
    },
    {
        key: "toggleEmphasis",
        command: emphasisCommand,
        dom: makeMenuIcon(
            "Italic",
            `Italic (${getShortcut("Mod-i")})`,
            "italic-btn"
        ),
    },
    {
        key: "toggleCode",
        command: inlineCodeCommand,
        dom: makeMenuIcon(
            "Code",
            `Inline Code (${getShortcut("Mod-k")})`,
            "code-btn"
        ),
    },
    addIf(
        {
            key: "toggleStrikethrough",
            command: strikethroughCommand,
            dom: makeMenuIcon("Strikethrough", "Strikethrough", "strike-btn"),
        },
        options.parserFeatures.extraEmphasis
    ),
    makeMenuSpacerEntry(),
    {
        key: "toggleLink",
        command: insertLinkCommand,
        dom: makeMenuIcon(
            "Link",
            `Link (${getShortcut("Mod-l")})`,
            "insert-link-btn"
        ),
    },
    {
        key: "toggleBlockquote",
        command: blockquoteCommand,
        dom: makeMenuIcon(
            "Quote",
            `Blockquote (${getShortcut("Ctrl-q")})`,
            "blockquote-btn"
        ),
    },
    {
        key: "insertCodeblock",
        command: insertCodeblockCommand,
        dom: makeMenuIcon(
            "Codeblock",
            `Code block (${getShortcut("Mod-m")})`,
            "code-block-btn"
        ),
    },
    addIf(
        {
            key: "insertImage",
            command: insertImageCommand,
            dom: makeMenuIcon(
                "Image",
                `Image (${getShortcut("Mod-g")})`,
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
                `Table (${getShortcut("Mod-e")})`,
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
            `Numbered list (${getShortcut("Mod-o")})`,
            "numbered-list-btn"
        ),
    },
    {
        key: "toggleUnorderedList",
        command: unorderedListCommand,
        dom: makeMenuIcon(
            "UnorderedList",
            `Bulleted list (${getShortcut("Mod-u")})`,
            "bullet-list-btn"
        ),
    },
    {
        key: "insertRule",
        command: insertHorizontalRuleCommand,
        dom: makeMenuIcon(
            "HorizontalRule",
            `Horizontal rule (${getShortcut("Mod-r")})`,
            "horizontal-rule-btn"
        ),
    },
    makeMenuSpacerEntry(() => false, ["sm:d-inline-block"]),
    {
        key: "undo",
        command: undo,
        dom: makeMenuIcon("Undo", "Undo", "undo-btn", ["sm:d-inline-block"]),
        visible: () => false,
    },
    {
        key: "redo",
        command: redo,
        dom: makeMenuIcon("Refresh", "Redo", "redo-btn", ["sm:d-inline-block"]),
        visible: () => false,
    },
    makeMenuSpacerEntry(),
    //TODO eventually this will mimic the "help" dropdown in the prod editor
    makeMenuLinkEntry("Help", "Help", options.editorHelpLink),
];
