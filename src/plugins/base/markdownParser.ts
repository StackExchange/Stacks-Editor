import { TokenConfig, defaultMarkdownParser } from "prosemirror-markdown";

export function generateMarkdownParser() {
    // extend the default markdown parser's tokens and add our own
    const customMarkdownParserTokens: { [key: string]: TokenConfig } = {
        ...defaultMarkdownParser.tokens,
        ...{
            bullet_list: {
                block: "bullet_list",
                getAttrs: (tok) => ({
                    tight: tok.attrGet("tight") === "true",
                }),
            },
            ordered_list: {
                block: "ordered_list",
                getAttrs: (tok) => ({
                    order: +tok.attrGet("start") || 1,
                    tight: tok.attrGet("tight") === "true",
                }),
            },

            code_block: {
                block: "code_block",
                getAttrs: (tok) => ({ params: tok.info || "" }),
            },

            // // override the default image parser so we can add our own extended attributes
            // image: {
            //     node: "image",
            //     getAttrs: (tok) => ({
            //         src: tok.attrGet("src"),
            //         width: tok.attrGet("width"),
            //         height: tok.attrGet("height"),
            //         alt:
            //             tok.attrGet("alt") ||
            //             tok.children?.[0]?.content ||
            //             null,
            //         title: tok.attrGet("title"),
            //     }),
            // },
        },
    };

    // add tag attribute support to all the marks like we did in schema
    // this allows us to map the original tags to / from markdown
    Object.keys(customMarkdownParserTokens).forEach((k) => {
        const token = customMarkdownParserTokens[k];

        // if an existing getAttrs function exists, make sure we wrap it and add our attributes in
        if (token.getAttrs) {
            const origGetAttrs = token.getAttrs.bind(
                token
            ) as typeof token.getAttrs;

            // reference links require special handling
            if (k === "link") {
                token.getAttrs = (tok) => {
                    const attrs = origGetAttrs(tok);
                    attrs.markup = tok.markup;

                    if (tok.markup === "reference") {
                        const meta = tok.meta as {
                            reference?: { type: string; label: string };
                        };
                        attrs.referenceType = meta?.reference?.type;
                        attrs.referenceLabel = meta?.reference?.label;
                    }

                    return attrs;
                };
            } else {
                token.getAttrs = (tok) => {
                    const attrs = origGetAttrs(tok);
                    attrs.markup = tok.markup;
                    return attrs;
                };
            }

            return;
        }

        // set a getAttrs function that returns the tag attribute
        token.getAttrs = (tok) => ({
            markup: tok.markup,
        });
    });

    return customMarkdownParserTokens;
}
