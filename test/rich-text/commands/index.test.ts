import { DOMParser } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { MenuCommand } from "../../../src/shared/menu";
import { richTextSchema } from "../../../src/shared/schema";
import "../../matchers";

/**
 * Creates a state with the content optionally selected if selectFrom/To are passed
 * @param content the document content
 * @param selectFrom string index to select from
 * @param selectTo string index to select to
 */
export function createState(
    content: string,
    selectFrom?: number,
    selectTo?: number
): EditorState {
    const container = document.createElement("div");
    // NOTE: tests only, no XSS danger
    // eslint-disable-next-line no-unsanitized/property
    container.innerHTML = content;
    const doc = DOMParser.fromSchema(richTextSchema).parse(container);
    let selection: TextSelection = undefined;

    if (typeof selectFrom !== "undefined") {
        // if selectTo not set, then this is not a selection, but a cursor position
        if (typeof selectTo === "undefined") {
            selectTo = selectFrom;
        }

        // document vs string offset is different, adjust
        selectFrom = selectFrom + 1;
        selectTo = selectTo + 1;
        selection = TextSelection.create(doc, selectFrom, selectTo);
    }

    return EditorState.create({
        doc: doc,
        schema: richTextSchema,
        selection: selection,
    });
}

/**
 * Applies a command to the state and expects it to apply correctly
 */
export function runCommand(
    state: EditorState,
    command: MenuCommand,
    expectSuccess = true
) {
    let newState = state;

    const isValid = command(state, (t) => {
        newState = state.apply(t);
    });

    expect(isValid).toBe(expectSuccess);
    return newState;
}
