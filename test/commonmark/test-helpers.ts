import { EditorState, Plugin } from "prosemirror-state";
import { commonmarkSchema } from "../../src/commonmark/schema";
import { CodeStringParser } from "../../src/shared/schema";

/** Creates a bare commonmark state with only the passed plugins enabled */
export function createState(content: string, plugins: Plugin[]): EditorState {
    const doc =
        CodeStringParser.fromSchema(commonmarkSchema).parseCode(content);

    return EditorState.create({
        doc: doc,
        plugins: plugins,
        schema: commonmarkSchema,
    });
}
