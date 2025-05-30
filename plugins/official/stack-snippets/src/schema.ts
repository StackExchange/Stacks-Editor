import MarkdownIt, { Token } from "markdown-it";
import { MarkdownParser } from "prosemirror-markdown";
import { Utils, MarkdownSerializerNodes } from "../../../../src";
import {
    assertAttrValue,
    getSnippetMetadata,
    mapMetaLine,
    RawContext,
    validateMetaLines,
    validSnippetRegex,
    MetaLine,
} from "./common";
import { Node as ProseMirrorNode, NodeSpec } from "prosemirror-model";

export const stackSnippetMarkdownParser: MarkdownParser["tokens"] = {
    stack_snippet: {
        block: "stack_snippet",
        getAttrs: (tok: Token) => ({
            //This is the entry point for tracking an ID when in rich text mode
            // Because it's not serialized, we can't track between states - so will be new every time we switch
            id: tok.attrGet("id"),
            hide: tok.attrGet("hide"),
            console: tok.attrGet("console"),
            babel: tok.attrGet("babel"),
            babelPresetReact: tok.attrGet("babelPresetReact"),
            babelPresetTS: tok.attrGet("babelPresetTS"),
        }),
    },

    stack_snippet_lang: {
        block: "stack_snippet_lang",
        noCloseToken: true,
        getAttrs: (tok: Token) => ({
            language: tok.attrGet("language"),
        }),
    },
};

export const stackSnippetMarkdownSerializer: MarkdownSerializerNodes = {
    stack_snippet(state, node) {
        const meta = getSnippetMetadata(node);
        state.write(
            `<!-- begin snippet: js hide: ${meta.hide} console: ${meta.console} babel: ${meta.babel} babelPresetReact: ${meta.babelPresetReact} babelPresetTS: ${meta.babelPresetTS} -->`
        );
        state.write("\n\n");
        node.forEach((langNode) => {
            const language = assertAttrValue(langNode, "language");
            state.write(`<!-- language: lang-${language} -->\n\n`);
            //Snippets expects a very specific format; no extra padding on empty lines
            // but the code itself needs padded with 4 spaces.
            const spacedContent = langNode.textContent
                .split("\n")
                .map((l) => (l !== "" ? "    " + l : l));
            for (let i = 0; i < spacedContent.length; i++) {
                state.write(spacedContent[i] + "\n");
            }
            state.write("\n");
        });
        state.write("<!-- end snippet -->");
        state.closeBlock(node);
    },
};

const parseSnippetBlockForMarkdownIt: MarkdownIt.ParserBlock.RuleBlock = (
    state: MarkdownIt.StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
) => {
    // if it's indented more than 3 spaces, it should be a code block
    if (state.sCount[startLine] - state.blkIndent >= 4) {
        return false;
    }

    //Snippets cannot be indented. If they are, they're talking _about_ snippets, so ignore.
    if (state.blkIndent != 0 || state.tShift[startLine] != 0) {
        return false;
    }

    //Grab the first line and check it for our opening snippet marker
    const openingLine = state.src.slice(
        state.bMarks[startLine],
        state.eMarks[startLine]
    );
    if (!validSnippetRegex.test(openingLine)) {
        return false;
    }

    let rawMetaLines: RawContext[] = [];
    let inSnippet = false;
    let snippetBegin: MetaLine | null = null;
    let currentLangLines: RawContext[] = [];

    //Next up, we want to find and test all the <!-- --> blocks we find.
    for (let i = startLine; i < endLine; i++) {
        //If it's not a `<` at the beginning, fail fast
        if (state.src.charCodeAt(state.bMarks[i]) != 60) {
            continue;
        }
        const line = state.src.slice(state.bMarks[i], state.eMarks[i]);
        if (!validSnippetRegex.test(line)) {
            continue;
        }

        const metaLine = mapMetaLine({ line, index: i });
        if (!metaLine) {
            continue;
        }

        if (metaLine.type === "begin") {
            if (inSnippet) {
                // Found a new begin while still in a snippet - invalid state
                state.line = i + 1;
                return false;
            }
            inSnippet = true;
            snippetBegin = metaLine;
            rawMetaLines = [{ line, index: i }];
            currentLangLines = [];
        } else if (metaLine.type === "lang") {
            if (!inSnippet) {
                state.line = i + 1;
                return false;
            }
            currentLangLines.push({ line, index: i });
            rawMetaLines.push({ line, index: i });
        } else if (metaLine.type === "end" && inSnippet) {
            rawMetaLines.push({ line, index: i });

            const metaLines = rawMetaLines
                .map(mapMetaLine)
                .filter((m) => m != null);
            const validationResult = validateMetaLines(metaLines);

            //We now know this is a valid snippet. Last call before we start processing
            if (silent || !validationResult.valid) {
                state.line = i + 1;
                return validationResult.valid;
            }

            // Create the snippet tokens
            const openToken = state.push("stack_snippet_open", "code", 1);
            // This value is not serialized, and so is different on every new session of Rich Text (i.e. every mode switch)
            openToken.attrSet("id", Utils.generateRandomId());
            if (!snippetBegin || snippetBegin.type !== "begin") {
                state.line = i + 1;
                return false;
            }
            openToken.attrSet("hide", snippetBegin.hide);
            openToken.attrSet("console", snippetBegin.console);
            openToken.attrSet("babel", snippetBegin.babel);
            openToken.attrSet(
                "babelPresetReact",
                snippetBegin.babelPresetReact
            );
            openToken.attrSet("babelPresetTS", snippetBegin.babelPresetTS);

            // Sort and process language blocks
            const langSort = currentLangLines.sort((a, b) => a.index - b.index);

            for (let j = 0; j < langSort.length; j++) {
                const langMeta = mapMetaLine(langSort[j]);
                if (!langMeta || langMeta.type !== "lang") continue;

                //Use the beginning of the next block to establish the end of this one, or the end of the snippet
                const langEnd =
                    j + 1 == langSort.length ? i : langSort[j + 1].index;
                //Start after the header of the lang block (+1) and the following empty line (+1)
                //End on the beginning of the next metaLine, less the preceding empty line (-1)
                //All lang blocks are forcefully indented 4 spaces, so cleave those away.
                const langBlock = state.getLines(
                    langSort[j].index + 2,
                    langEnd - 1,
                    4,
                    false
                );
                const langToken = state.push("stack_snippet_lang", "code", 1);
                langToken.content = langBlock;
                langToken.map = [langSort[j].index, langEnd];
                langToken.attrSet("language", langMeta.language);
            }

            state.push("stack_snippet_close", "code", -1);
            state.line = i + 1;

            return true;
        }
    }

    // If we're still in a snippet at the end, it means we never found an end marker
    if (inSnippet) {
        state.line = endLine;
        return false;
    }

    return false;
};

export const stackSnippetRichTextNodeSpec: { [name: string]: NodeSpec } = {
    stack_snippet: {
        //It can have exactly 3 lang blocks: html, css, js.
        // These look the same, and I don't think we need to be picky about order.
        content: "stack_snippet_lang{1,3}",
        group: "block",
        selectable: false,
        inline: false,
        defining: true,
        isolating: true,
        attrs: {
            id: {},
            content: { default: null },
            hide: { default: "null" },
            console: { default: "null" },
            babel: { default: "null" },
            babelPresetReact: { default: "null" },
            babelPresetTS: { default: "null" },
            showCode: { default: true },
            showResult: { default: true },
            fullscreen: { default: false },
        },
    },
    stack_snippet_lang: {
        content: "text*",
        code: true,
        defining: true,
        isolating: true,
        inline: false,
        attrs: {
            language: {
                default: "",
                validate: (value: unknown) => {
                    if (typeof value !== "string") {
                        return false;
                    }
                    return ["js", "css", "html"].includes(value);
                },
            },
        },
        toDOM(node: ProseMirrorNode) {
            const rawLang: unknown = node.attrs.language;
            let language = "";
            if (rawLang && typeof rawLang == "string") {
                language = rawLang;
            }
            //`s-code-block` enables code block styles at present
            // The rest are legacy hold-overs from stack-snippets. Maybe not worth keeping.
            return [
                "pre",
                {
                    class: `s-code-block prettyprint-override snippet-code-${language} lang-${language}`,
                },
                ["code", 0],
            ];
        },
    },
};

export const stackSnippetPlugin = (md: MarkdownIt) => {
    md.block.ruler.before(
        "fence",
        "stack_snippet",
        parseSnippetBlockForMarkdownIt
    );
};
