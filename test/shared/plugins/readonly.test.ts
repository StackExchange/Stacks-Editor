import { EditorState, Transaction } from "prosemirror-state";
import {
    readonlyPlugin,
    editableCheck,
    toggleReadonly,
} from "../../../src/shared/prosemirror-plugins/readonly";
import { DOMParser } from "prosemirror-model";
import { commonmarkSchema } from "../../../src/shared/schema";

function createState() {
    return EditorState.create({
        schema: commonmarkSchema,
        doc: DOMParser.fromSchema(commonmarkSchema).parse(
            document.createElement("pre")
        ),
        plugins: [readonlyPlugin()],
    });
}

function getPluginState(state: EditorState): boolean {
    return state.plugins[0].getState(state) as boolean;
}

function toggleAndApplyState(state: EditorState, value: boolean) {
    let tr: Transaction;

    const dispatch = (trans: Transaction) => {
        tr = trans;
    };

    toggleReadonly(value, state, dispatch);

    if (tr) {
        state = state.apply(tr);
    }

    return { state, tr };
}

describe("readonly plugin", () => {
    it("should initialize to false", () => {
        const state = createState();

        const pluginState = getPluginState(state);
        expect(pluginState).toBe(false);
    });
    it("should provide DirectEditorProps.editable", () => {
        const initialState = createState();

        // readonly is off by default, so this should return true
        let isEditable = editableCheck(initialState);
        expect(isEditable).toBe(true);

        // now toggle and see that it returns false
        const { state } = toggleAndApplyState(initialState, true);
        isEditable = editableCheck(state);
        expect(isEditable).toBe(false);
    });

    describe("toggleReadonly", () => {
        it("should toggle state", () => {
            let state = createState();
            let tr: Transaction;

            // toggle off -> on first
            ({ state, tr } = toggleAndApplyState(state, true));
            expect(tr).toBeDefined();
            expect(getPluginState(state)).toBe(true);

            // now toggle on -> off
            ({ state, tr } = toggleAndApplyState(state, false));
            expect(tr).toBeDefined();
            expect(getPluginState(state)).toBe(false);
        });
        it("should not transact when state doesn't change", () => {
            let state = createState();
            let tr: Transaction;

            // first, set to "off" when already off
            ({ state, tr } = toggleAndApplyState(state, false));
            expect(tr).toBeUndefined();

            // toggle on for next bit...
            ({ state, tr } = toggleAndApplyState(state, true));

            // now, set to "on" when already on
            ({ state, tr } = toggleAndApplyState(state, true));
            expect(tr).toBeUndefined();
        });
    });
});
