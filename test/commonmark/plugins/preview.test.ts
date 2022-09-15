import {
    createPreviewPlugin,
    previewIsVisible,
    togglePreviewVisibility,
} from "../../../src/commonmark/plugins/preview";
import { createView } from "../../rich-text/test-helpers";
import { createState } from "../test-helpers";

describe("preview plugin", () => {
    let pluginContainer: Element;

    it("should call the renderer callback", () => {
        const renderer = jest.fn(() => Promise.resolve());

        pluginContainer = document.createElement("div");

        const state = createState("test content", [
            createPreviewPlugin({
                enabled: true,
                shownByDefault: true,
                parentContainer: () => pluginContainer,
                renderDelayMs: 0,
                renderer,
            }),
        ]);

        createView(state);

        expect(renderer).toHaveBeenCalledWith<[string, HTMLElement]>(
            "test content",
            expect.any(HTMLElement) as HTMLElement
        );
    });

    it("should require a renderer method when preview is enabled", () => {
        expect(() => {
            const state = createState("test content", [
                createPreviewPlugin({
                    enabled: true,
                    parentContainer: () => pluginContainer,
                    renderer: null,
                }),
            ]);
            createView(state);
        }).toThrow(/renderer is required/);
    });

    it("should update the preview when the content changes", () => {
        const renderer = jest.fn(() => Promise.resolve());

        pluginContainer = document.createElement("div");

        const state = createState("test content", [
            createPreviewPlugin({
                enabled: true,
                shownByDefault: true,
                parentContainer: () => pluginContainer,
                renderDelayMs: 0,
                renderer,
            }),
        ]);

        const view = createView(state);

        expect(renderer).toHaveBeenCalledWith(
            "test content",
            expect.any(HTMLElement) as HTMLElement
        );

        view.dispatch(view.state.tr.insertText("new text ", 0));

        expect(renderer).toHaveBeenCalledWith(
            "new text test content",
            expect.any(HTMLElement) as HTMLElement
        );
    });

    it.todo("should delay the preview update each time the content changes");

    it("should initially render when enabled and shown by default", () => {
        const renderer = jest.fn(() => Promise.resolve());
        pluginContainer = document.createElement("div");

        const state = createState("", [
            createPreviewPlugin({
                enabled: true,
                shownByDefault: true,
                parentContainer: () => pluginContainer,
                renderDelayMs: 0,
                renderer,
            }),
        ]);

        createView(state);

        expect(pluginContainer.querySelector(".js-md-preview")).toBeTruthy();
        expect(renderer).toHaveBeenCalledTimes(1);
    });

    it.each([
        { enabled: false, shownByDefault: false },
        { enabled: true, shownByDefault: false },
        { enabled: false, shownByDefault: true },
    ])(
        "should not initially render when disabled or not shown by default",
        ({ enabled, shownByDefault }) => {
            const renderer = jest.fn(() => Promise.resolve());
            pluginContainer = document.createElement("div");

            const state = createState("", [
                createPreviewPlugin({
                    enabled: enabled,
                    shownByDefault: shownByDefault,
                    parentContainer: () => pluginContainer,
                    renderDelayMs: 0,
                    renderer,
                }),
            ]);

            createView(state);

            expect(pluginContainer.querySelector(".js-md-preview")).toBeNull();
            expect(renderer).toHaveBeenCalledTimes(0);
        }
    );

    it("should allow toggling the visibility of the preview", () => {
        const renderer = jest.fn(() => Promise.resolve());
        pluginContainer = document.createElement("div");

        const state = createState("", [
            createPreviewPlugin({
                enabled: true,
                shownByDefault: false,
                parentContainer: () => pluginContainer,
                renderDelayMs: 0,
                renderer,
            }),
        ]);

        const view = createView(state);

        // expect it to not be rendered
        expect(previewIsVisible(view)).toBe(false);
        expect(pluginContainer.querySelector(".js-md-preview")).toBeNull();
        expect(renderer).toHaveBeenCalledTimes(0);

        togglePreviewVisibility(view, true);

        // expect it to be rendered
        expect(previewIsVisible(view)).toBe(true);
        expect(pluginContainer.querySelector(".js-md-preview")).toBeTruthy();
        expect(renderer).toHaveBeenCalledTimes(1);

        togglePreviewVisibility(view, false);

        // expect it not to be rendered again
        expect(previewIsVisible(view)).toBe(false);
        expect(pluginContainer.querySelector(".js-md-preview")).toBeNull();
        expect(renderer).toHaveBeenCalledTimes(1);
    });
});
