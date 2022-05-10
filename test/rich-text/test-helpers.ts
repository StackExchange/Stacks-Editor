import { DOMParser, Schema } from "prosemirror-model";
import {
    EditorState,
    Plugin,
    TextSelection,
    Transaction,
} from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { MenuCommand } from "../../src/shared/menu";
import { richTextSchema } from "../../src/shared/schema";

/**
 * Url to use when testing (de)serialization that contains special encodings/other pitfalls and
 * also goes the extra mile to conform to the more strict RFC3986
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent}
 * @see {@link https://datatracker.ietf.org/doc/html/rfc3986#section-2.2}
 */
export const crazyTestUrl =
    `https://example.com/whatever?q=` +
    encodeURIComponent(
        `prefix:("+#some-zany_input.that,encodes~like*CRAZY?!_[don't@me&=send$$$]/);`
    ).replace(/[-_.!~*'()]/g, (c) => `%${c.charCodeAt(0).toString(16)}`);

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
        plugins: [],
    });
}

/** Applies a text selection to the passed state based on the given from/to */
export function applySelection(
    state: EditorState<Schema>,
    from: number,
    to?: number
): EditorState<Schema> {
    const tr = setSelection(state.tr, from, to);
    return state.apply(tr);
}

/** Creates a text selection transaction based on the given from/to */
export function setSelection(
    tr: Transaction,
    from: number,
    to?: number
): Transaction {
    if (typeof to === "undefined") {
        to = from;
    }

    tr = tr.setSelection(TextSelection.create(tr.doc, from + 1, to + 1));

    return tr;
}

/** Applies a command to the state and expects it to apply correctly */
export function runCommand(
    state: EditorState<Schema>,
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

/** Sets up ProseMirror paste support globally for jsdom */
export function setupPasteSupport(): void {
    Range.prototype.getClientRects = () => ({
        item: () => null,
        length: 0,
        [Symbol.iterator]: jest.fn(),
    });

    Range.prototype.getBoundingClientRect = () =>
        jest.mocked<DOMRect>({} as never);
}

/** Tears down ProseMirror paste support globally for jsdom */
export function cleanupPasteSupport(): void {
    Range.prototype.getClientRects = undefined;

    Range.prototype.getBoundingClientRect = undefined;
}

/** Partial mock of DataTransfer for jsdom */
export class DataTransferMock implements DataTransfer {
    constructor(private data: Record<string, string>) {}

    dropEffect: DataTransfer["dropEffect"];
    effectAllowed: DataTransfer["effectAllowed"];
    files: FileList;
    items: DataTransferItemList;
    types: readonly string[];
    clearData(): void {
        throw new Error("Method not implemented.");
    }
    getData(format: string): string {
        return this.data[format];
    }
    setData(format: string, data: string): void {
        this.data[format] = data;
    }
    setDragImage(): void {
        throw new Error("Method not implemented.");
    }
}

/** Dispatches a paste event with the given records added to the clipboardData */
export function dispatchPasteEvent(
    el: Element,
    data: Record<string, string>
): void {
    const event = new Event("paste");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    event.clipboardData = new DataTransferMock(data);

    el.dispatchEvent(event);
}

/** Returns a promise that is resolved delayMs from when it is called */
export function sleepAsync(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), delayMs);
    });
}
