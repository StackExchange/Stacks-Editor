import { EditorPlugin } from "../../../../src";
import { MathJaxOptions } from "./common";
import { mathJaxInputRules, mathJaxTransactionRules } from "./input-rules";
import { mathJaxPasteHandler } from "./paste-handler";
import { MathJaxView } from "./math-view";
import {
    mathJaxMarkdownParser,
    mathJaxMarkdownPlugin,
    mathJaxMarkdownSerializer,
    mathJaxRichTextNodeSpec,
} from "./schema";

/** Build the official MathJax plugin using host-provided rendering callbacks. */
export const mathJaxPlugin: (options?: MathJaxOptions) => EditorPlugin =
    (options) => () => ({
        richText: {
            plugins: [
                mathJaxPasteHandler(options),
                mathJaxInputRules(options),
                mathJaxTransactionRules(options),
            ],
            nodeViews: {
                math_inline: (node) => new MathJaxView(node, false, options),
                math_block: (node) => new MathJaxView(node, true, options),
            },
        },
        extendSchema: (schema) => {
            schema.nodes = schema.nodes.append(mathJaxRichTextNodeSpec);
            return schema;
        },
        markdown: {
            parser: mathJaxMarkdownParser,
            serializers: {
                nodes: mathJaxMarkdownSerializer,
                marks: {},
            },
            alterMarkdownIt: (markdownIt) => {
                markdownIt.use(mathJaxMarkdownPlugin, options);
            },
        },
    });
