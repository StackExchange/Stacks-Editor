import { richTextSchema } from "../../../src/shared/schema";
import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import { DOMParser, Schema } from "prosemirror-model";
import { linkTooltipPlugin } from "../../../src/rich-text/plugins/link-tooltip";
import { DecorationSet, EditorView } from "prosemirror-view";
import { insertLinkCommand } from "../../../src/rich-text/commands";

// TODO move to helpers?
function createState(content: string) {
    const container = document.createElement("div");
    container.innerHTML = content;
    const doc = DOMParser.fromSchema(richTextSchema).parse(container);

    return EditorState.create({
        doc: doc,
        schema: richTextSchema,
        plugins: [linkTooltipPlugin],
    });
}

function createView(state: EditorState<Schema>) {
    return new EditorView(document.createElement("div"), {
        state: state,
    });
}

function getDecorations(state: EditorState<Schema>) {
    const pState = state.plugins[0].getState(state) as {
        decorations: DecorationSet;
    };
    return pState.decorations;
}

function applySelection(state: EditorState<Schema>, from: number, to?: number) {
    if (typeof to === "undefined") {
        to = from;
    }

    let tr = state.tr;
    tr = tr.setSelection(
        TextSelection.create(state.doc, from + 1, to + 1)
    ) as Transaction<Schema>;
    return state.apply(tr);
}

function getRenderedDecoration(
    state: EditorState,
    editorView?: EditorView
): HTMLElement {
    const decorations = getDecorations(state);
    const decoration = decorations.find(state.selection.from)[0];
    expect(decoration).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pState = state.plugins[0].getState(state);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Oh snap, we're going off the grid!
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const renderer = decoration["type"].toDOM.bind(pState.linkTooltip) as (
        view: EditorView
    ) => HTMLElement;

    const view = editorView || createView(state);

    return renderer(view);
}

describe("link-tooltip", () => {
    it("should not show with no cursor", () => {
        const state = createState(`<a href="https://www.example.com">test</a>`);
        const decorations = getDecorations(state);

        expect(decorations).toEqual(DecorationSet.empty);
    });

    it("should not show with cursor on non-links", () => {
        let state = createState(
            `<p>test<a href="https://www.example.com">link</a></p>`
        );
        state = applySelection(state, 0);

        const currentNode = state.doc.nodeAt(state.selection.from);

        const decorations = getDecorations(state);

        expect(currentNode.isText).toBe(true);
        expect(currentNode.text).toBe("test");
        expect(currentNode.marks).toHaveLength(0);

        expect(decorations).toEqual(DecorationSet.empty);
    });

    it("should show with cursor on links", () => {
        let state = createState(
            `<p>test<a href="https://www.example.com">link</a></p>`
        );

        state = applySelection(state, 5);

        const currentNode = state.doc.nodeAt(state.selection.from);

        expect(currentNode.isText).toBe(true);
        expect(currentNode.text).toBe("link");
        expect(currentNode.marks).toHaveLength(1);
        expect(currentNode.marks[0].attrs).toHaveProperty("href");

        const decorations = getDecorations(state);
        expect(decorations).not.toEqual(DecorationSet.empty);
    });

    it("should show as non-edit on cursor", () => {
        let state = createState(
            `<p>test<a href="https://www.example.com">link</a></p>`
        );

        state = applySelection(state, 5);

        const renderedDeco = getRenderedDecoration(state);
        const input = renderedDeco.querySelector("input[type=text]");

        expect(input.classList).toContain("d-none");
    });

    it("should show as edit on create", () => {
        let state = createState(`<p>link-to-be</p>`);
        const view = createView(state);

        state = applySelection(state, 0, 10);

        // make sure we highlighted the entire text
        expect(state.doc.nodeAt(state.selection.from).text).toBe("link-to-be");

        insertLinkCommand(state, view.dispatch.bind(null), view);
        state = view.state;

        const renderedDeco = getRenderedDecoration(state, view);
        const input = renderedDeco.querySelector("input[type=text]");

        expect(input.classList).not.toContain("d-none");
        expect((input as HTMLInputElement).value).toEqual("https://");
    });

    // TODO failing
    it.skip("should edit on button click", () => {
        let state = createState(
            `<p>test<a href="https://www.example.com">link</a></p>`
        );

        state = applySelection(state, 5);

        const renderedDeco = getRenderedDecoration(state);
        renderedDeco
            .querySelector<HTMLButtonElement>(".js-link-tooltip-edit")
            .click();

        const input = renderedDeco.querySelector("input[type=text]");

        expect(input.classList).not.toContain("d-none");
    });

    // TODO failing/incomplete
    it.skip("should save on button click", () => {
        let state = createState(`<p>link-to-be</p>`);
        const view = createView(state);

        state = applySelection(state, 0, 10);

        // make sure we highlighted the entire text
        expect(state.doc.nodeAt(state.selection.from).text).toBe("link-to-be");

        insertLinkCommand(state, view.dispatch.bind(null), view);
        state = view.state;

        let renderedDeco = getRenderedDecoration(state, view);
        let input = renderedDeco.querySelector<HTMLInputElement>(
            "input[type=text]"
        );
        expect(input.classList).not.toContain("d-none");

        //const newLink = (input.value = "https://www.example.com/jest-test");

        renderedDeco
            .querySelector<HTMLButtonElement>(".js-link-tooltip-apply")
            .click();

        // view/state gets updated on click
        state = view.state;

        renderedDeco = getRenderedDecoration(state, view);
        input = renderedDeco.querySelector<HTMLInputElement>(
            "input[type=text]"
        );

        // TODO not working...
        // expect(input.classList).toContain("d-none");
        // expect(state.doc.nodeAt(state.selection.from).marks[0].attrs.href).toBe(
        //     newLink
        // );
    });
});
