import {
    DOMParser,
    Node as ProseMirrorNode,
    ParseOptions,
    ParseRule,
    Schema,
} from "prosemirror-model";
import { escapeHTML } from "./utils";

/** Parses out a Prosemirror document from a code (markdown) string */
export class CodeStringParser extends DOMParser {
    // TODO missing from @types
    declare static schemaRules: (schema: Schema) => ParseRule[];

    public parseCode(content: string, options?: ParseOptions): ProseMirrorNode {
        const node = document.createElement("div");
        node.innerHTML = escapeHTML`<pre>${content}</pre>`;

        return super.parse(node, options);
    }

    static fromSchema(schema: Schema): CodeStringParser {
        return (
            (schema.cached.domParser as CodeStringParser) ||
            (schema.cached.domParser = new CodeStringParser(
                schema,
                CodeStringParser.schemaRules(schema)
            ))
        );
    }

    static toString(node: ProseMirrorNode): string {
        return node.textBetween(0, node.content.size, "\n\n");
    }
}
