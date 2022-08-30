import {
    createPreviewPlugin,
    previewIsVisible,
    togglePreviewVisibility,
} from "../../../src/commonmark/plugins/preview";
import { createView } from "../../rich-text/test-helpers";
import { createState } from "../test-helpers";

describe("preview plugin", () => {
    let pluginContainer: Element;

    it.each([
        {
            content: "",
            expectedPreview: "",
        },
        {
            content: "# Here’s a thought",
            expectedPreview: "<h1>Here’s a thought</h1>\n",
        },
        {
            content: "**bold**",
            expectedPreview: "<p><strong>bold</strong></p>\n",
        },
        {
            content:
                "* unordered\n* lists\n    * even with nesting\n* and back again",
            expectedPreview:
                '<ul tight="true">\n<li>unordered</li>\n<li>lists\n<ul tight="true">\n<li>even with nesting</li>\n</ul>\n</li>\n<li>and back again</li>\n</ul>\n',
        },
    ])("should render the expected preview output", (obj) => {
        pluginContainer = document.createElement("div");
        const { content, expectedPreview } = obj;

        const state = createState(content, [
            createPreviewPlugin(
                {
                    enabled: true,
                    shownByDefault: true,
                    parentContainer: () => pluginContainer,
                },
                {}
            ),
        ]);

        createView(state);

        const previewHTML =
            pluginContainer.querySelector(".js-md-preview").innerHTML;

        expect(previewHTML).toBe(expectedPreview);
    });

    it.todo("should update the preview when the content changes");
    it.todo("should delay the preview update each time the content changes");

    it("should initially render when enabled and shown by default", () => {
        pluginContainer = document.createElement("div");

        const state = createState("", [
            createPreviewPlugin(
                {
                    enabled: true,
                    shownByDefault: true,
                    parentContainer: () => pluginContainer,
                },
                {}
            ),
        ]);

        createView(state);

        expect(pluginContainer.querySelector(".js-md-preview")).toBeTruthy();
    });

    it.each([
        { enabled: false, shownByDefault: false },
        { enabled: true, shownByDefault: false },
        { enabled: false, shownByDefault: true },
    ])(
        "should not initially render when disabled or not shown by default",
        ({ enabled, shownByDefault }) => {
            pluginContainer = document.createElement("div");

            const state = createState("", [
                createPreviewPlugin(
                    {
                        enabled: enabled,
                        shownByDefault: shownByDefault,
                        parentContainer: () => pluginContainer,
                    },
                    {}
                ),
            ]);

            createView(state);

            expect(pluginContainer.querySelector(".js-md-preview")).toBeNull();
        }
    );

    it("should allow toggling the visibility of the preview", () => {
        pluginContainer = document.createElement("div");

        const state = createState("", [
            createPreviewPlugin(
                {
                    enabled: true,
                    shownByDefault: false,
                    parentContainer: () => pluginContainer,
                    renderDelayMs: 0,
                },
                {}
            ),
        ]);

        const view = createView(state);

        // expect it to not be rendered
        expect(previewIsVisible(view)).toBe(false);
        expect(pluginContainer.querySelector(".js-md-preview")).toBeNull();

        togglePreviewVisibility(view, true);

        // expect it to be rendered
        expect(previewIsVisible(view)).toBe(true);
        expect(pluginContainer.querySelector(".js-md-preview")).toBeTruthy();

        togglePreviewVisibility(view, false);

        // expect it not to be rendered again
        expect(previewIsVisible(view)).toBe(false);
        expect(pluginContainer.querySelector(".js-md-preview")).toBeNull();
    });
});
