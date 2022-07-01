import { EditorState, Plugin } from "prosemirror-state";
import { createPreviewPlugin } from "../../../src/commonmark/plugins/preview";
import { commonmarkSchema } from "../../../src/commonmark/schema";
import { CodeStringParser } from "../../../src/shared/schema";
import { createView } from "../../rich-text/test-helpers";

// TODO add to test-helpers
/** Creates a bare commonmark state with only the passed plugins enabled */
function createState(content: string, plugins: Plugin[]): EditorState {
    const doc =
        CodeStringParser.fromSchema(commonmarkSchema).parseCode(content);

    return EditorState.create({
        doc: doc,
        plugins: plugins,
        schema: commonmarkSchema,
    });
}

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
                { enabled: true, parentContainer: () => pluginContainer },
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
});
