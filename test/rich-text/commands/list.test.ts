import { TextSelection } from "prosemirror-state";
import { applySelection, createState, createView } from "../test-helpers";
import {
    toggleList,
    wrapAndMaybeJoinList,
    maybeJoinList,
    isListType,
} from "../../../src/rich-text/commands";

describe("toggleList", () => {
    it("should wrap the selected text in a list when it is inactive", () => {
        let state = createState(
            "<p>List Item 1</p><p>List Item 2</p><p>List Item 3</p>",
            []
        );
        const view = createView(state);

        // select all list items
        state = applySelection(state, 3, state.doc.nodeSize - 4);

        const command = toggleList(
            state.schema.nodes.bullet_list,
            state.schema.nodes.list_item
        );

        command(state, view.dispatch.bind(view));

        expect(view.state.doc).toMatchNodeTree({
            "type.name": "doc",
            "childCount": 1,
            "content": [
                {
                    "type.name": "bullet_list",
                    "childCount": 3,
                    "content": [
                        {
                            "type.name": "list_item",
                            "content": [
                                {
                                    "type.name": "paragraph",
                                    "content": [
                                        {
                                            "type.name": "text",
                                            "text": "List Item 1",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            "type.name": "list_item",
                            "content": [
                                {
                                    "type.name": "paragraph",
                                    "content": [
                                        {
                                            "type.name": "text",
                                            "text": "List Item 2",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            "type.name": "list_item",
                            "content": [
                                {
                                    "type.name": "paragraph",
                                    "content": [
                                        {
                                            "type.name": "text",
                                            "text": "List Item 3",
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    });

    it("should remove the selected text from the list when it is active", () => {
        let state = createState(
            "<ul><li>List Item 1</li><li>List Item 2</li><li>List Item 3</li></ul>",
            []
        );
        const view = createView(state);

        // select all list items
        state = applySelection(state, 8, state.doc.nodeSize - 10);

        const command = toggleList(
            state.schema.nodes.bullet_list,
            state.schema.nodes.list_item
        );

        command(state, view.dispatch.bind(view));

        expect(view.state.doc).toMatchNodeTree({
            "type.name": "doc",
            "childCount": 3,
            "content": [
                {
                    "type.name": "paragraph",
                    "content": [
                        {
                            "type.name": "text",
                            "text": "List Item 1",
                        },
                    ],
                },
                {
                    "type.name": "paragraph",
                    "content": [
                        {
                            "type.name": "text",
                            "text": "List Item 2",
                        },
                    ],
                },
                {
                    "type.name": "paragraph",
                    "content": [
                        {
                            "type.name": "text",
                            "text": "List Item 3",
                        },
                    ],
                },
            ],
        });
    });
});

describe("wrapAndMaybeJoinList", () => {
    it("should wrap the selected content in a list and join with existing list(s) of the same type", () => {
        let state = createState(
            "<ul><li>List Item 1</li></ul><p>List Item 2</p><ul><li>List Item 3</li></ul>",
            []
        );
        const view = createView(state);

        // select List Item 2
        state = applySelection(state, 17, state.doc.nodeSize - 21);

        const command = wrapAndMaybeJoinList(state.schema.nodes.bullet_list);

        command(state, view.dispatch.bind(view));

        expect(view.state.doc).toMatchNodeTree({
            "type.name": "doc",
            "childCount": 1,
            "content": [
                {
                    "type.name": "bullet_list",
                    "childCount": 3,
                    "content": [
                        {
                            "type.name": "list_item",
                            "content": [
                                {
                                    "type.name": "paragraph",
                                    "content": [
                                        {
                                            "type.name": "text",
                                            "text": "List Item 1",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            "type.name": "list_item",
                            "content": [
                                {
                                    "type.name": "paragraph",
                                    "content": [
                                        {
                                            "type.name": "text",
                                            "text": "List Item 2",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            "type.name": "list_item",
                            "content": [
                                {
                                    "type.name": "paragraph",
                                    "content": [
                                        {
                                            "type.name": "text",
                                            "text": "List Item 3",
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    });
});

describe("maybeJoinList", () => {
    it("should join two lists of the same type", () => {
        const state = createState(
            "<ul><li>List Item 1</li></ul><ul><li>List Item 2</li></ul>",
            []
        );
        const tr = state.tr.setSelection(TextSelection.create(state.doc, 3, 3));
        const result = maybeJoinList(tr);
        expect(result).toBe(true);
        expect(tr.doc.childCount).toBe(1); // The two lists should have been joined into one
    });

    it("should not join two lists of different types", () => {
        const state = createState(
            "<ul><li>List Item 1</li></ul><ol><li>List Item 2</li></ol>",
            []
        );
        const tr = state.tr.setSelection(TextSelection.create(state.doc, 3, 3));
        const result = maybeJoinList(tr);
        expect(result).toBe(false);
        expect(tr.doc.childCount).toBe(2); // The two lists should not have been joined
    });
});

describe("isListType", () => {
    it("should return true if the node type is a list type", () => {
        const schema = createState("", []).schema;
        const bulletList = schema.nodes.bullet_list;
        const orderedList = schema.nodes.ordered_list;
        const listItem = schema.nodes.list_item;

        expect(isListType(bulletList)).toBe(true);
        expect(isListType(orderedList)).toBe(true);
        expect(isListType(listItem)).toBe(false);
    });
});
