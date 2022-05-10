import { EditorState } from "prosemirror-state";
import { exitInclusiveMarkCommand } from "../../../src/rich-text/commands";
import { richTextSchema } from "../../../src/rich-text/schema";
import { applySelection, createState } from "../test-helpers";

function getEndOfNode(state: EditorState, nodePos: number) {
    let from = nodePos;
    state.doc.nodesBetween(1, state.doc.content.size, (node, pos) => {
        from = pos + node.nodeSize - 1;
        return true;
    });

    return from;
}

describe("commands", () => {
    describe("toggleBlockType", () => {
        it.todo("should insert a paragraph at the end of the doc");
        it.todo("should not insert a paragraph at the end of the doc");
    });

    describe("exitMarkCommand", () => {
        it("all exitable marks should also be inclusive: true", () => {
            Object.keys(richTextSchema.marks).forEach((markName) => {
                const mark = richTextSchema.marks[markName];

                try {
                    // require exitable marks to be explicitly marked as inclusive
                    expect(!mark.spec.exitable || mark.spec.inclusive).toBe(
                        true
                    );
                } catch {
                    // add a custom error message when the test fails
                    throw `${markName} is not both exitable *and* inclusive\ninclusive: ${String(
                        mark.spec.inclusive
                    )}`;
                }
            });
        });

        it.each([
            [`middle of some text`, false],
            [`<em>cannot exit emphasis from anywhere</em>`, true],
            [`<code>cannot exit code from middle</code>`, false],
        ])("should not exit unexitable marks", (input, positionCursorAtEnd) => {
            let state = createState(input, []);

            let from = Math.floor(input.length / 2);

            if (positionCursorAtEnd) {
                from = getEndOfNode(state, 0);
            }

            state = applySelection(state, from);

            expect(exitInclusiveMarkCommand(state, null)).toBe(false);
        });

        it.each([`<code>exit code mark</code>`, `<kbd>exit kbd mark</kbd>`])(
            "should exit exitable marks",
            (input) => {
                let state = createState(input, []);
                const from = getEndOfNode(state, 0);

                state = applySelection(state, from);
                expect(exitInclusiveMarkCommand(state, null)).toBe(true);
            }
        );
    });
});
