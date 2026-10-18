import MarkdownIt from "markdown-it";
import { Slice } from "prosemirror-model";
import { defaultMarkdownParser, MarkdownParser } from "prosemirror-markdown";
import { Plugin } from "prosemirror-state";
import { MathJaxOptions } from "./common";
import { mathJaxMarkdownParser, mathJaxMarkdownPlugin } from "./schema";

/** Parse pasted Markdown as a complete document when it contains MathJax. */
export function mathJaxPasteHandler(options?: MathJaxOptions): Plugin {
    const markdownIt = new MarkdownIt("default", {}).use(
        mathJaxMarkdownPlugin,
        options
    );

    return new Plugin({
        props: {
            handlePaste(view, event) {
                const text = event.clipboardData?.getData("text/plain");
                if (!text || view.state.selection.$from.parent.type.spec.code) {
                    return false;
                }

                const parser = new MarkdownParser(
                    view.state.schema,
                    markdownIt,
                    {
                        ...defaultMarkdownParser.tokens,
                        ...mathJaxMarkdownParser,
                    }
                );
                const parsed = parser.parse(text);
                let containsMath = false;
                parsed.descendants((node) => {
                    if (
                        node.type.name === "math_inline" ||
                        node.type.name === "math_block"
                    ) {
                        containsMath = true;
                    }
                });

                if (!containsMath) {
                    return false;
                }

                view.dispatch(
                    view.state.tr.replaceSelection(
                        Slice.maxOpen(parsed.content)
                    )
                );
                return true;
            },
        },
    });
}
