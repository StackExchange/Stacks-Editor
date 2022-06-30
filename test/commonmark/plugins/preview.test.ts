import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { createPreviewPlugin } from "../../../src/commonmark/plugins/preview";
import { commonmarkSchema } from "../../../src/commonmark/schema";
import { CodeStringParser } from "../../../src/shared/schema";
import { createView } from "../../rich-text/test-helpers";

// TODO add to test-helpers
/**
 * Creates a state with the content optionally selected if selectFrom/To are passed
 * @param content the document content
 */
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
    let view: EditorView;

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
        view = createView(state);

        const previewHTML =
            pluginContainer.querySelector(".js-md-preview").innerHTML;

        expect(previewHTML).toBe(expectedPreview);
    });
});
