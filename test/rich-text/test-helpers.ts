import { DOMParser, Schema } from "prosemirror-model";
import {
    EditorState,
    Plugin,
    TextSelection,
    Transaction,
} from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { richTextSchema } from "../../src/shared/schema";

/** Creates a bare rich-text state with only the passed plugins enabled */
export function createState(
    htmlContent: string,
    plugins: Plugin[]
): EditorState {
    const container = document.createElement("div");
    // NOTE: tests only, no XSS danger
    // eslint-disable-next-line no-unsanitized/property
    container.innerHTML = htmlContent;
    const doc = DOMParser.fromSchema(richTextSchema).parse(container);

    return EditorState.create({
        doc: doc,
        schema: richTextSchema,
        plugins: plugins,
    });
}

/** Creates a bare editor view with only the passed state and nothing else */
export function createView(state: EditorState<Schema>): EditorView<Schema> {
    return new EditorView(document.createElement("div"), {
        state: state,
    });
}

/** Applies a text selection to the passed state based on the given from/to */
export function applySelection(
    state: EditorState<Schema>,
    from: number,
    to?: number
): EditorState<Schema> {
    if (typeof to === "undefined") {
        to = from;
    }

    let tr = state.tr;
    tr = tr.setSelection(
        TextSelection.create(state.doc, from + 1, to + 1)
    ) as Transaction<Schema>;
    return state.apply(tr);
}
