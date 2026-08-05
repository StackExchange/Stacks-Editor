import { StacksEditor } from "../../src/stacks-editor/editor";

jest.mock("../../src/shared/utils", () => {
    const actual = jest.requireActual<typeof import("../../src/shared/utils")>(
        "../../src/shared/utils"
    );

    return {
        ...actual,
        startStickyObservers: jest.fn(),
    };
});

describe("StacksEditor", () => {
    let editor: StacksEditor;
    let target: HTMLElement;

    beforeEach(() => {
        target = document.createElement("div");
        editor = new StacksEditor(target, "");
    });

    afterEach(() => editor.destroy());

    it("prevents menu mouse interactions from blurring the editor", () => {
        const dropdown = target.querySelector<HTMLElement>(
            ".js-editor-menu .s-btn__dropdown"
        );
        const event = new MouseEvent("mousedown", {
            bubbles: true,
            cancelable: true,
        });

        dropdown.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
    });

    it("allows plugin controls to receive focus", () => {
        const pluginTarget = target.querySelector<HTMLElement>(
            ".js-plugin-container > div:last-child"
        );
        const input = document.createElement("input");
        const event = new MouseEvent("mousedown", {
            bubbles: true,
            cancelable: true,
        });
        pluginTarget.appendChild(input);

        input.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });
});
