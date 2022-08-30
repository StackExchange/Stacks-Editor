import { createPreviewPlugin } from "../../../src/commonmark/plugins/preview";
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

    it("should not render when disabled", () => {
        pluginContainer = document.createElement("div");

        const state = createState("", [
            createPreviewPlugin(
                {
                    enabled: false,
                    shownByDefault: true,
                    parentContainer: () => pluginContainer,
                },
                {}
            ),
        ]);

        createView(state);

        expect(pluginContainer.querySelector(".js-md-preview")).toBeNull();
    });
});
