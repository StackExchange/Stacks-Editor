import { MarkdownSerializerState } from "prosemirror-markdown";
import { Node as PMNode } from "prosemirror-model";
import { defaultMarkdownSerializer } from "prosemirror-markdown";
import { EditorPlugin, EditorPluginSpec } from "../../shared/editor-plugin";

export const fencedCodeSerializer: EditorPlugin = (): EditorPluginSpec =>
    ({
        markdown: {
            serializers: {
                nodes: {
                    code_block(state: MarkdownSerializerState, node: PMNode) {
                        const { params, markup } = node.attrs as {
                            params: string;
                            markup?: string | null;
                        };

                        // helper: was this really a fence?
                        const isFence = (m: string) =>
                            m.startsWith("`") || m.startsWith("~");

                        if (params) {
                            // user picked a language
                            // only reuse old marker if it was a real fence, else default to backticks
                            const marker = isFence(markup || "")
                                ? markup
                                : "```";
                            state.write(marker + params + "\n");
                            state.text(node.textContent, false);
                            state.ensureNewLine();
                            state.write(marker);
                            state.closeBlock(node);
                        } else if (isFence(markup || "")) {
                            // untouched fence (no language)
                            state.write(markup + "\n");
                            state.text(node.textContent, false);
                            state.ensureNewLine();
                            state.write(markup);
                            state.closeBlock(node);
                        } else {
                            // pure indent-only block
                            node.textContent
                                .split("\n")
                                .forEach((line, i, arr) => {
                                    state.write("    " + line);
                                    if (i < arr.length - 1) state.write("\n");
                                });
                            state.closeBlock(node);
                        }
                    },
                },
                marks: defaultMarkdownSerializer.marks,
            },
        },
    }) as unknown as EditorPluginSpec;
