import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { EditorType } from "../../../src";
import { MenuCommandExtended, MenuItem } from "../../../src/shared/menu";
import { MenuView, createMenuPlugin } from "../../../src/shared/menu/plugin";
import { createState } from "../../commonmark/test-helpers";
import { applySelection, createView } from "../../rich-text/test-helpers";
import { getPluginViewInstance } from "../../test-helpers";

function item(key: string, base?: Partial<MenuItem>): MenuItem {
    return {
        richText: () => true,
        commonmark: () => true,
        display: {
            svg: "svg-class",
            label: "item-label",
        },
        key,
        ...base,
    };
}

function setDisabled(state: EditorState): EditorState {
    const from = state.doc.textContent.indexOf("disabled");
    const to = from + "disabled".length;
    return applySelection(state, from, to);
}

function setActive(state: EditorState): EditorState {
    const from = state.doc.textContent.indexOf("active");
    const to = from + "active".length;
    return applySelection(state, from, to);
}

function setHidden(state: EditorState): EditorState {
    const from = state.doc.textContent.indexOf("hide");
    const to = from + "hide".length;
    return applySelection(state, from, to);
}

const enabledCommand: MenuCommandExtended["command"] = (state) =>
    state.doc.textBetween(state.selection.from, state.selection.to) !==
    "disabled";

const activeCommand: MenuCommandExtended["active"] = (state) =>
    state.doc.textBetween(state.selection.from, state.selection.to) ===
    "active";

const visibleCommand: MenuCommandExtended["visible"] = (state) =>
    state.doc.textBetween(state.selection.from, state.selection.to) !== "hide";

describe("menu plugin view", () => {
    let view: EditorView;
    let menu: MenuView;

    beforeEach(() => {
        const customItem = document.createElement("button");
        customItem.className = "js-htmlelement";
        const plugin = createMenuPlugin(
            [
                {
                    name: "block1",
                    entries: [
                        item("standard", {
                            commonmark: {
                                command: enabledCommand,
                                active: activeCommand,
                                visible: visibleCommand,
                            },
                        }),
                        item("htmlelement", {
                            display: customItem,
                        }),
                    ],
                    priority: 100,
                    classes: ["extra-classes"],
                },
                {
                    name: "block2",
                    entries: [
                        item("dropdown", {
                            children: [
                                item("dropdown-item", {
                                    commonmark: {
                                        command: enabledCommand,
                                        active: activeCommand,
                                        visible: visibleCommand,
                                    },
                                }),
                            ],
                        }),
                    ],
                    priority: 10,
                },
                {
                    name: "invisible",
                    entries: [],
                    priority: Infinity,
                    visible: visibleCommand,
                },
            ],
            () => document.createElement("div"),
            EditorType.Commonmark
        );
        const state = createState(
            "add some text for commands - hide, active, disabled",
            [plugin]
        );
        view = createView(state);
        menu = getPluginViewInstance(view, MenuView);
    });

    it("should create blocks in priority order", () => {
        expect(menu.dom.childElementCount).toBe(3);
        expect(menu.dom.children.item(0).classList).toContain(
            "js-block-block2"
        );
        expect(menu.dom.children.item(1).classList).toContain(
            "js-block-block1"
        );
        expect(menu.dom.children.item(2).classList).toContain(
            "js-block-invisible"
        );
    });

    it("should track and update a block's visible state", () => {
        // check that the block is visible initially
        let isVisible = visibleCommand(view.state);
        expect(isVisible).toBe(true);
        expect(
            menu.dom.querySelector(".js-block-invisible").classList
        ).not.toContain("d-none");

        // update the state to hide the block, then check again
        view.updateState(setHidden(view.state));
        isVisible = visibleCommand(view.state);
        expect(isVisible).toBe(false);
        expect(
            menu.dom.querySelector(".js-block-invisible").classList
        ).toContain("d-none");
    });

    it("should create dom entries for all item types", () => {
        // basic item
        let item = menu.dom.querySelector(".js-standard");
        expect(item.nodeName).toBe("BUTTON");
        expect(item.firstElementChild.classList).toContain("iconsvg-class");
        expect(item.getAttribute("aria-label")).toBe("item-label");

        // item w/ DOM already set
        item = menu.dom.querySelector(".js-htmlelement");
        expect(item.nodeName).toBe("BUTTON");
        expect(item.childElementCount).toBe(0);
        expect(item.getAttribute("aria-label")).toBeNull();

        // dropdown menu item
        // check the button
        item = menu.dom.querySelector(".js-dropdown");
        expect(item.nodeName).toBe("BUTTON");
        expect(item.firstElementChild.classList).toContain("iconsvg-class");
        expect(item.getAttribute("aria-controls")).toBeDefined();
        expect(item.getAttribute("aria-label")).toBe("item-label");

        // check the children menu
        item = menu.dom.querySelector(`#${item.getAttribute("aria-controls")}`);
        expect(item).toBeDefined();
        expect(item.querySelectorAll(".js-editor-btn")).toHaveLength(1);
    });

    it("should track and update an entry's enabled, active and visible states", () => {
        const getItem = () => menu.dom.querySelector(".js-standard");
        view.hasFocus = () => true;

        // check item is visible, enabled and inactive
        expect(enabledCommand(view.state, null)).toBe(true);
        expect(visibleCommand(view.state)).toBe(true);
        expect(activeCommand(view.state)).toBe(false);

        let item = getItem();
        expect(item.attributes).not.toHaveProperty("disabled");
        expect(item.attributes).not.toContain("disabled");
        expect(item.classList).not.toContain("is-selected");
        expect(item.classList).not.toContain("d-none");

        // hidden
        view.updateState(setHidden(view.state));
        expect(visibleCommand(view.state)).toBe(false);
        item = getItem();
        expect(item.classList).toContain("d-none");

        // active
        view.updateState(setActive(view.state));
        expect(activeCommand(view.state)).toBe(true);
        item = getItem();
        expect(item.classList).toContain("is-selected");

        // disabled
        view.updateState(setDisabled(view.state));
        expect(enabledCommand(view.state, null)).toBe(false);
        item = getItem();
        expect(item.attributes).toHaveProperty("disabled");
    });

    it.todo("should dispatch an item's command when clicked");
});
