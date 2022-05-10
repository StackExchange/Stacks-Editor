import { insertParagraphIfAtDocEnd } from "../../../src/rich-text/commands/helpers";
import { createState, setSelection } from "../test-helpers";
import { richTextSchema } from "../../../src/rich-text/schema";

describe("commands helpers", () => {
    describe("insertParagraphIfAtDocEnd", () => {
        it("should insert a paragraph at the end of the doc", () => {
            const state = createState("", []);

            // add in a new node to get a doc altering transaction
            let tr = state.tr.insert(
                state.tr.doc.content.size,
                richTextSchema.nodes.code_block.create()
            );

            // place the cursor after the start of the newly inserted node
            tr = setSelection(
                tr,
                tr.doc.content.size - tr.doc.lastChild.nodeSize
            );

            expect(tr.doc.lastChild.type.name).toBe("code_block");
            expect(tr.selection.$from.node().type.name).toBe("code_block");

            // run the insert check
            tr = insertParagraphIfAtDocEnd(tr);
            expect(tr.doc.lastChild.type.name).toBe("paragraph");
        });

        it("should not insert a paragraph at the end of the doc", () => {
            const state = createState("this is a test", []);

            // add in a new node to get a doc altering transaction
            let tr = state.tr.insert(
                3,
                richTextSchema.nodes.code_block.create()
            );

            // place the cursor after the start of the newly inserted node
            tr = setSelection(tr, 4);

            // check the doc looks as we'd expect
            expect(tr.doc.childCount).toBe(3);
            expect(tr.selection.$from.node().type.name).toBe("code_block");
            expect(tr.doc.lastChild.type.name).toBe("paragraph");
            expect(tr.doc.lastChild.content.child(0).text).toBe("is is a test");

            // run the insert check
            tr = insertParagraphIfAtDocEnd(tr);
            expect(tr.doc.childCount).toBe(3);
            expect(tr.doc.lastChild.type.name).toBe("paragraph");
            expect(tr.doc.lastChild.content.child(0).text).toBe("is is a test");
        });
    });
});
