import { EditorState } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { insertLinkCommand } from "../../../src/rich-text/commands";
import { linkTooltipPlugin } from "../../../src/rich-text/plugins/link-editor";
import { stackOverflowValidateLink } from "../../../src/shared/utils";
import { applySelection, createState, createView } from "../test-helpers";

const tooltipPlugin = linkTooltipPlugin({
    validateLink: stackOverflowValidateLink,
});

function getDecorations(state: EditorState) {
    const pState = state.plugins[0].getState(state) as {
        decorations: DecorationSet;
    };
    return pState.decorations;
}

function getRenderedDecoration(
    state: EditorState,
    editorView?: EditorView
): HTMLElement {
    const decorations = getDecorations(state);
    const decoration = decorations.find(
        state.selection.from
    )[0] as Decoration<unknown>;
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
        const state = createState(
            `<a href="https://www.example.com">test</a>`,
            [tooltipPlugin]
        );
        const decorations = getDecorations(state);

        expect(decorations).toEqual(DecorationSet.empty);
    });

    it("should not show with cursor on non-links", () => {
        let state = createState(
            `<p>test<a href="https://www.example.com">link</a></p>`,
            [tooltipPlugin]
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
            `<p>test<a href="https://www.example.com">link</a></p>`,
            [tooltipPlugin]
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
            `<p>test<a href="https://www.example.com">link</a></p>`,
            [tooltipPlugin]
        );

        state = applySelection(state, 5);

        const renderedDeco = getRenderedDecoration(state);
        const input = renderedDeco.querySelector(
            ".js-link-tooltip-input-wrapper"
        );

        expect(input.classList).toContain("d-none");
    });

    it("should show as edit on create", () => {
        let state = createState(`<p>link-to-be</p>`, [tooltipPlugin]);
        const view = createView(state);

        state = applySelection(state, 0, 10);

        // make sure we highlighted the entire text
        expect(state.doc.nodeAt(state.selection.from).text).toBe("link-to-be");

        insertLinkCommand(state, view.dispatch.bind(null), view);
        state = view.state;

        const renderedDeco = getRenderedDecoration(state, view);
        const inputWrapper = renderedDeco.querySelector(
            ".js-link-tooltip-input-wrapper"
        );
        const input = renderedDeco.querySelector(".js-link-tooltip-input");

        expect(inputWrapper.classList).not.toContain("d-none");
        expect((input as HTMLInputElement).value).toBe("https://");
    });

    it.skip("should edit on button click", () => {
        let state = createState(
            `<p>test<a href="https://www.example.com">link</a></p>`,
            [tooltipPlugin]
        );
        const view = createView(state);

        state = applySelection(state, 5);

        let renderedDeco = getRenderedDecoration(state);
        renderedDeco
            .querySelector<HTMLButtonElement>(".js-link-tooltip-edit")
            .click();

        renderedDeco = getRenderedDecoration(state, view);
        const inputWrapper = renderedDeco.querySelector(
            ".js-link-tooltip-input-wrapper"
        );

        expect(inputWrapper.classList).not.toContain("d-none");
    });

    // TODO failing/incomplete
    // TODO test for custom validateLink support
    it.skip("should save on button click", () => {
        let state = createState(`<p>link-to-be</p>`, [tooltipPlugin]);
        const view = createView(state);

        state = applySelection(state, 0, 10);

        // make sure we highlighted the entire text
        expect(state.doc.nodeAt(state.selection.from).text).toBe("link-to-be");

        insertLinkCommand(state, view.dispatch.bind(null), view);
        state = view.state;

        let renderedDeco = getRenderedDecoration(state, view);
        let inputWrapper = renderedDeco.querySelector(
            ".js-link-tooltip-input-wrapper"
        );
        expect(inputWrapper.classList).not.toContain("d-none");

        //const newLink = (input.value = "https://www.example.com/jest-test");

        renderedDeco
            .querySelector<HTMLButtonElement>(".js-link-tooltip-apply")
            .click();

        // view/state gets updated on click
        state = view.state;

        renderedDeco = getRenderedDecoration(state, view);
        inputWrapper = renderedDeco.querySelector(
            ".js-link-tooltip-input-wrapper"
        );

        // TODO not working...
        // expect(input.classList).toContain("d-none");
        // expect(state.doc.nodeAt(state.selection.from).marks[0].attrs.href).toBe(
        //     newLink
        // );
    });
});
