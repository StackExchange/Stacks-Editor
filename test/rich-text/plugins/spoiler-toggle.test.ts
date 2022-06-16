import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { spoilerToggle } from "../../../src/rich-text/plugins/spoiler-toggle";
import { applySelection, createState } from "../test-helpers";

/** Get the top-level spoiler node directly from the doc's children */
function getSpoilerNode(state: EditorState) {
    let node: Node = null;
    state.doc.forEach((n) => {
        if (n.type.name === "spoiler") {
            node = n;
            return false;
        }
    });

    return node;
}

describe("spoiler-toggle plugin", () => {
    it.skip("should toggle reveal on cursor entry/exit", () => {
        let state = createState(
            "<p>test</p><blockquote class='spoiler'>this is a spoiler</blockquote><p>test</p>",
            [spoilerToggle]
        );

        // set the selection to be outside the spoiler (base state)
        // and check that the revealed attr is false
        state = applySelection(state, 0);
        let node = getSpoilerNode(state);
        expect(node.attrs.revealed).toBe(false);

        // set the selection to be inside the spoiler (toggle on)
        // and check that the revealed attr is true
        state = applySelection(state, 6);
        node = getSpoilerNode(state);
        expect(node.attrs.revealed).toBe(true);

        // set the selection to be outside the spoiler (toggle off)
        // and check that the revealed attr is false
        state = applySelection(state, 0);
        node = getSpoilerNode(state);
        expect(node.attrs.revealed).toBe(false);
    });

    it.skip("should toggle reveal when contained in/excluded from text selection", () => {
        let state = createState(
            "<p>test</p><blockquote class='spoiler'>this is a spoiler</blockquote><p>test</p>",
            [spoilerToggle]
        );

        // set the selection to be outside the spoiler (base state)
        // and check that the revealed attr is false
        state = applySelection(state, 0);
        let node = getSpoilerNode(state);
        expect(node.attrs.revealed).toBe(false);

        // set the selection to partially contain the spoiler (toggle on)
        // and check that the revealed attr is false
        state = applySelection(state, 0, 7);
        node = getSpoilerNode(state);
        expect(node.attrs.revealed).toBe(true);

        // set the selection to exclude the spoiler (toggle off)
        // and check that the revealed attr is false
        state = applySelection(state, 0, 2);
        node = getSpoilerNode(state);
        expect(node.attrs.revealed).toBe(false);

        // set the selection to partially include the spoiler (toggle on)
        // and check that the revealed attr is false
        state = applySelection(state, 2, 23);
        node = getSpoilerNode(state);
        expect(node.attrs.revealed).toBe(true);
    });

    it("should intelligently handle toggling when the doc has changed", () => {
        let state = createState(
            "<p>test</p><blockquote class='spoiler'>this is a spoiler</blockquote><p>test</p>",
            [spoilerToggle]
        );

        // go ahead and toggle the spoiler on (not testing this; tested above)
        state = applySelection(state, 7);

        // apply a transaction manually that changes the doc / positioning of the node, but not the selection
        let tr = state.tr;
        tr = tr.insertText("", 0, 4);
        state = state.apply(tr);
        // double check the doc text, just for our sanity when setting the selection below
        expect(state.doc.textContent).toBe("tthis is a spoilertest");

        // now double check the node
        let node = getSpoilerNode(state);
        expect(node.attrs.revealed).toBe(true);

        // update the selection to partially select the node (altering indexes due to document change)
        state = applySelection(state, 0, 5);

        // apply a transaction manually that updates the node / selection
        tr = state.tr;
        tr = tr.deleteSelection();
        state = state.apply(tr);

        // once again, just checking for our sanity
        expect(state.doc.textContent).toBe("his is a spoilertest");

        // we've only partially deleted the spoiler, so the cursor will still be "in" the spoiler
        // check the node the cursor is on and also check that our spoiler is revealed
        expect(state.selection.empty).toBe(true);
        expect(state.selection.$anchor.node(1).type.name).toBe("spoiler");
        node = getSpoilerNode(state);
        expect(node.attrs.revealed).toBe(true);

        // now, just delete the entire spoiler
        tr = state.tr;
        tr = tr.deleteRange(
            state.selection.from,
            state.selection.from + node.nodeSize - 1
        );
        state = state.apply(tr);

        // once again, just checking for our sanity
        expect(state.doc.textContent).toBe("test");

        // check that the spoiler is entirely gone
        expect(state.doc.childCount).toBe(1);
        expect(getSpoilerNode(state)).toBeNull();
    });
});
