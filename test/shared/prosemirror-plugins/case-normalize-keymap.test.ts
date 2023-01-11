import { createState, createView } from "../../rich-text/test-helpers";
import { caseNormalizeKeymap } from "../../../src/shared/prosemirror-plugins/case-normalize-keymap";

describe("case-normalize-keymap", () => {
    it("should normalize the event with the key letter in lowercase when the shift modifier is NOT pressed", () => {
        const zLowercaseMockCommand = jest.fn();
        const zUppercaseMockCommand = jest.fn();
        const view = createView(
            createState("", [
                caseNormalizeKeymap({
                    z: zLowercaseMockCommand,
                    Z: zUppercaseMockCommand,
                }),
            ])
        );

        const event = new KeyboardEvent("keydown", {
            key: "Z",
        });
        view.dom.dispatchEvent(event);

        expect(zLowercaseMockCommand).toHaveBeenCalled();
        expect(zUppercaseMockCommand).not.toHaveBeenCalled();
    });

    it("should normalize the event with the key letter in uppercase when the shift modifier is pressed", () => {
        const zLowercaseMockCommand = jest.fn();
        const zUppercaseMockCommand = jest.fn();
        const view = createView(
            createState("", [
                caseNormalizeKeymap({
                    z: zLowercaseMockCommand,
                    Z: zUppercaseMockCommand,
                }),
            ])
        );

        const event = new KeyboardEvent("keydown", {
            key: "z",
            shiftKey: true,
        });
        view.dom.dispatchEvent(event);

        expect(zLowercaseMockCommand).not.toHaveBeenCalled();
        expect(zUppercaseMockCommand).toHaveBeenCalled();
    });

    it("should not normalize keyboard events when their key is not a letter", () => {
        const mockCommand = jest.fn();
        const view = createView(
            createState("", [
                caseNormalizeKeymap({ "Shift-Enter": mockCommand }),
            ])
        );

        const event = new KeyboardEvent("keydown", {
            key: "Enter",
            shiftKey: true,
        });
        view.dom.dispatchEvent(event);

        expect(mockCommand).toHaveBeenCalled();
    });
});
