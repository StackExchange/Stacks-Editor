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

    it("keeps toolbar controls in a horizontally scrolling row", () => {
        const toolbar = target.querySelector<HTMLElement>(".js-editor-toolbar");

        expect(Array.from(toolbar.classList)).toEqual(
            expect.arrayContaining(["d-flex", "fw-nowrap", "overflow-x-auto"])
        );
        expect(
            Array.from(toolbar.querySelector(".js-editor-menu").classList)
        ).toEqual(expect.arrayContaining(["fw-nowrap", "fl-shrink0"]));
        expect(
            Array.from(toolbar.querySelector(".s-editor-btn-group").classList)
        ).toEqual(
            expect.arrayContaining([
                "d-inline-flex",
                "s-btn-group",
                "fw-nowrap",
                "ba",
                "bc-black-300",
                "bar-md",
            ])
        );
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
