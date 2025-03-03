import MarkdownIt, { Token } from "markdown-it";
import type { EditorPlugin } from "../editor-plugin";
import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import {
    AsyncPlugin,
    AsyncPluginKey,
} from "../prosemirror-plugins/plugin-extensions";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Md5 } from "ts-md5";
import { docNodeChanged } from "../utils";
import { CommonViewOptions } from "../view";
import {log} from "../logger";

const validSnippetRegex =
    /^<!-- (?:begin snippet:|end snippet |language:)(.*)-->$/;
const langSnippetRegex = /^<!-- language: lang-(?<lang>css|html|js) -->/;
//Match the start snippet. Original editor is not order resilient.
const startSnippetRegex =
    /^<!-- begin snippet: js (?:hide: (?<hide>(?:true|false|null))\s)(?:console: (?<console>(?:true|false|null))\s)(?:babel: (?<babel>(?:true|false|null))\s)(?:babelPresetReact: (?<babelPresetReact>(?:true|false|null))\s)(?:babelPresetTS: (?<babelPresetTS>(?:true|false|null))\s)-->/;

/** The cache of a snippet's hash -> content for executed snippet content so we don't have to continually refetch */
const snippetResultCache: { [hash: string]: Node } = {};

export interface StackSnippetOptions {
    /** The async function to render the preview */
    renderer: (
        meta: SnippetMetadata,
        js?: string,
        css?: string,
        html?: string
    ) => Promise<Node | null>;
}

interface BaseMetaLine {
    type: "begin" | "end" | "lang";
    index: number;
}

interface BeginMetaLine extends BaseMetaLine {
    type: "begin";
    //Strictly speaking these are `boolean | null`, but they don't affect operation
    babel: string;
    babelPresetReact: string;
    babelPresetTS: string;
    console: string;
    hide: string;
}

interface EndMetaLine extends BaseMetaLine {
    type: "end";
}

interface LangMetaLine extends BaseMetaLine {
    type: "lang";
    language: string;
}

type MetaLine = BeginMetaLine | EndMetaLine | LangMetaLine;

const mapMetaLine = (rawContext: RawContext): MetaLine | null => {
    //Easiest first - Is it just the end snippet line?
    const { line, index } = rawContext;
    if (line === "<!-- end snippet -->") {
        return { type: "end", index };
    }

    const langMatch = line.match(langSnippetRegex);
    if (langMatch) {
        return {
            type: "lang",
            index,
            language: langMatch.groups["lang"],
        };
    }

    const startMatch = line.match(startSnippetRegex);
    //Stack snippets inserts all these options (true/false/null) If they're not there, it's not valid.
    if (
        startMatch &&
        startMatch.groups["babel"] &&
        startMatch.groups["babelPresetReact"] &&
        startMatch.groups["babelPresetTS"] &&
        startMatch.groups["console"] &&
        startMatch.groups["hide"]
    ) {
        return {
            type: "begin",
            index,
            babel: startMatch.groups["babel"] || "null",
            babelPresetReact: startMatch.groups["babelPresetReact"] || "null",
            babelPresetTS: startMatch.groups["babelPresetTS"] || "null",
            console: startMatch.groups["console"] || "null",
            hide: startMatch.groups["hide"] || "null",
        };
    }

    return null;
};
interface ValidationResult {
    valid: boolean;
    beginIndex?: number;
    endIndex?: number;
    htmlIndex?: number;
    cssIndex?: number;
    jsIndex?: number;
    reason?: string;
}
const validateMetaLines = (metaLines: MetaLine[]): ValidationResult => {
    //We now have an ordered list of our meta lines, so...
    const validationResult: ValidationResult = {
        valid: false,
        reason: "Did not discover beginning and end",
    };
    //Validate, returning immediately on duplicates.
    for (let i = 0; i < metaLines.length; i++) {
        const m = metaLines[i];
        switch (m.type) {
            case "begin":
                if (validationResult.beginIndex)
                    return { valid: false, reason: "Duplicate Begin block" };
                validationResult.beginIndex = m.index;
                break;
            case "end":
                if (validationResult.endIndex)
                    return { valid: false, reason: "Duplicate End block" };
                validationResult.endIndex = m.index;
                break;
            case "lang":
                switch (m.language) {
                    case "js":
                        if (validationResult.jsIndex)
                            return {
                                valid: false,
                                reason: "Duplicate JS block",
                            };
                        validationResult.jsIndex = m.index;
                        break;
                    case "html":
                        if (validationResult.htmlIndex)
                            return {
                                valid: false,
                                reason: "Duplicate HTML block",
                            };
                        validationResult.htmlIndex = m.index;
                        break;
                    case "css":
                        if (validationResult.cssIndex)
                            return {
                                valid: false,
                                reason: "Duplicate CSS block",
                            };
                        validationResult.cssIndex = m.index;
                        break;
                }
                break;
        }
        //If we've encountered a start and an end without duplicates, that's all the blocks we're processing for now
        if (
            validationResult.beginIndex != null &&
            validationResult.endIndex != null
        ) {
            validationResult.valid = true;
            validationResult.reason = null;
            break;
        }
    }

    return validationResult;
};

interface RawContext {
    line: string;
    index: number;
}
const parseSnippetBlock: MarkdownIt.ParserBlock.RuleBlock = (
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
        rawMetaLines = [...rawMetaLines, { line, index: i }];
    }

    const metaLines = rawMetaLines.map(mapMetaLine).filter((m) => m != null);
    const validationResult = validateMetaLines(metaLines);

    //We now know this is a valid snippet. Last call before we start processing
    if (silent || !validationResult.valid) {
        return validationResult.valid;
    }

    //A valid block must start with a begin and end, so cleave the opening and closing from the lines
    const begin = metaLines.shift();
    if (begin.type !== "begin") return false;
    const end = metaLines.pop();
    if (end.type !== "end") return false;

    //The rest must be langs, sort them by index
    const langSort = metaLines
        .filter((m) => m.type == "lang") //Not strictly necessary, but useful for typing
        .sort((a, b) => a.index - b.index);
    if (!langSort.every((l) => l.type === "lang")) return false;

    const openToken = state.push("stack_snippet_open", "code", 1);
    openToken.attrSet("hide", begin.hide);
    openToken.attrSet("console", begin.console);
    openToken.attrSet("babel", begin.babel);
    openToken.attrSet("babelPresetReact", begin.babelPresetReact);
    openToken.attrSet("babelPresetTS", begin.babelPresetTS);

    for (let i = 0; i < langSort.length; i++) {
        //Use the beginning of the next block to establish the end of this one, or the end of the snippet
        const langEnd =
            i + 1 == langSort.length ? end.index : langSort[i + 1].index;
        //Start after the header of the lang block (+1) and the following empty line (+1)
        //End on the beginning of the next metaLine, less the preceding empty line (-1)
        //All lang blocks are forcefully indented 4 spaces, so cleave those away.
        const langBlock = state.getLines(
            langSort[i].index + 2,
            langEnd - 1,
            4,
            false
        );
        const langToken = state.push("stack_snippet_lang", "code", 1);
        langToken.content = langBlock;
        langToken.map = [langSort[i].index, langEnd];
        langToken.attrSet("language", langSort[i].language);
    }
    state.push("stack_snippet_close", "code", -1);
    state.line = end.index + 1;
    return true;
};

const assertAttrValue = (node: ProsemirrorNode, attrName: string): string => {
    const attr: unknown = node.attrs[attrName];
    if (!attr) {
        return "null";
    }
    if (typeof attr != "string") {
        return "null";
    }
    return attr;
};

interface SnippetMetadata {
    hide: string;
    console: string;
    babel: string;
    babelPresetReact: string;
    babelPresetTS: string;
    langNodes: LanguageNode[];
}

interface LanguageMetadata {
    language: string;
}
interface LanguageNode {
    metaData: LanguageMetadata;
    content: string;
}

const getSnippetMetadata = (node: ProsemirrorNode): SnippetMetadata | null => {
    if (node.type.name !== "stack-snippet") return null;

    const hide = assertAttrValue(node, "hide");
    const consoleAttr = assertAttrValue(node, "console");
    const babel = assertAttrValue(node, "babel");
    const babelPresetReact = assertAttrValue(node, "babelPresetReact");
    const babelPresetTS = assertAttrValue(node, "babelPresetTS");

    const langNodes: LanguageNode[] = [];
    node.descendants((l) => {
        if (l.type.name == "stack-snippet-lang") {
            const langNode = getLanguageNode(l);
            if (langNode) {
                langNodes.push(langNode);
            }
            return false;
        }
        return true;
    });

    return {
        hide,
        console: consoleAttr,
        babel,
        babelPresetReact,
        babelPresetTS,
        langNodes,
    };
};

const getLanguageNode = (node: ProsemirrorNode): LanguageNode | null => {
    if (node.type.name == "stack-snippet-lang") {
        const language = assertAttrValue(node, "language");
        return {
            metaData: {
                language,
            },
            content: node.textContent,
        };
    }
    return null;
};

/**
 * Hash a Stack Snippet node for comparison to other snippets
 * @param metaData Metadata about the snippet
 * @param langNodes Array of data about languages in the snippet
 */
const hashSnippetValues = (metaData: SnippetMetadata): string | null => {
    const md5 = new Md5();
    md5.appendStr(JSON.stringify(metaData));

    for (let i = 0; i < metaData.langNodes.length; i++) {
        md5.appendStr(JSON.stringify(metaData.langNodes[i]));
    }

    const hex = md5.end(false);
    //If it's not a string something has gone catastrophically wrong with the typings
    return typeof hex === "string" ? hex : null;
};

interface StackSnippetState {
    decorations: DecorationSet;
    recentlyUpdated?: FetchCompiledSnippetResult[];
}

interface FetchCompiledSnippetResult {
    pos: number;
    content?: Node | null;
}

const STACK_SNIPPET_KEY = new AsyncPluginKey<
    StackSnippetState,
    FetchCompiledSnippetResult[]
>("linkPreviews");

/**
 * Fetches and caches all link preview content for every link node in the view
 * @param view The view to search for valid link nodes
 * @param providers The list of registered providers
 */
function fetchSnippetResult(
    view: EditorView,
    prevState: EditorState,
    opts: StackSnippetOptions
): Promise<FetchCompiledSnippetResult[]> {
    const nodes = getStackSnippetNodes(view.state, prevState);
    // if there's no new nodes to render, just reject (no need to update the state)
    if (!nodes.length) {
        return Promise.reject(null);
    }

    const results = nodes.map((n) => {
        const meta = getSnippetMetadata(n.node);

        const hash = hashSnippetValues(meta);
        const previouslyCached = hash in snippetResultCache;
        const cachedContent = snippetResultCache[hash] || null;

        //Fetch the first item that matches, or undefined.
        // We're not in the business of defensively coding this here. Should be handled upstream.
        const [js] = meta.langNodes.filter((l) => l.metaData.language == "js");
        const [css] = meta.langNodes.filter(
            (l) => l.metaData.language == "css"
        );
        const [html] = meta.langNodes.filter(
            (l) => l.metaData.language == "html"
        );

        const basePromise = previouslyCached
            ? Promise.resolve(cachedContent)
            : opts.renderer(meta, js?.content, css?.content, html?.content);

        const output: FetchCompiledSnippetResult & {
            promise?: Promise<FetchCompiledSnippetResult>;
        } = {
            pos: n.pos,
        };

        output.promise = basePromise
            .then((content) => {
                snippetResultCache[hash] = content;

                return {
                    content,
                    pos: n.pos,
                };
            })
            // don't let any errors crash our `.all` below
            // "catch" and fake a resolution
            .catch(() => {
                // TODO make this look nice
                const errorPlaceholder = document.createElement("div");
                errorPlaceholder.innerText = "Error rendering snippet.";
                // set the cache here too, so we don't refetch errors every time...
                snippetResultCache[hash] = errorPlaceholder;
                return Promise.resolve(<FetchCompiledSnippetResult>{});
            });

        return output;
    });

    // trigger the rendering immediately
    STACK_SNIPPET_KEY.dispatchCallbackData(view, results);

    return Promise.all(results.map((p) => p.promise));
}

/**
 * Gets nodes in the document that are of the type we want
 */
function getStackSnippetNodes(currState: EditorState, prevState: EditorState) {
    // if the document didn't change, then we don't need to do anything
    if (!docNodeChanged(currState, prevState)) {
        return;
    }

    const validNodes: {
        pos: number;
        node: ProsemirrorNode;
    }[] = [];

    // iterate over current document structure
    currState.doc.descendants((node, pos) => {
        if (node.type.name == "stack-snippet") {
            validNodes.push({ pos, node });
            // no need to go into this node's descendants
            return false;
        }
    });

    return validNodes;
}

/**
 * Inserts the link preview's content into the link's decoration/placeholder
 */
function insertSnippetResults(pos: number, content: Node | null) {
    const container = document.createElement("div");
    container.className = "snippet-result";

    const ctas = document.createElement("div");
    ctas.className = "snippet-ctas"

    //TODO: todo
    const todo = document.createElement("p");
    todo.textContent = "TODO: Make this some buttons";
    ctas.appendChild(todo)

    container.appendChild(ctas);

    if (content) {
        //TODO: Add the rest of the stuff that makes this actually work
        const iframe = document.createElement("iframe");
        container.appendChild(iframe);
        iframe.appendChild(content.cloneNode(true));
    }

    return Decoration.widget(pos, container, {
        side: 1,
    });
}

/**
 * Run over the entire document and find all previewable links and create a link preview decoration
 * for each.
 */
function generateAllDecorations(state: EditorState) {
    const nodes = getStackSnippetNodes(state, null);
    const mapped: FetchCompiledSnippetResult[] = nodes.map((n) => {
        const meta = getSnippetMetadata(n.node);
        const hash = hashSnippetValues(meta);
        return {
            pos: n.pos,
            content: snippetResultCache[hash]
        };
    });

    return generateRecentChangeDecorations(state.doc, mapped);
}

/**
 * Create a link preview decorations for a set of specific link preview results.
 * @param {Document} doc - The document to generate decorations against
 * @param recentlyUpdated - Snippet results that have been updated, and need decorations
 */
function generateRecentChangeDecorations(
    doc: ProsemirrorNode,
    recentlyUpdated: FetchCompiledSnippetResult[]
) {
    const decorations: Decoration[] = [];

    recentlyUpdated.forEach((n) => {
        decorations.push(insertSnippetResults(n.pos, n.content));
    });
    //Do some decorations
    return DecorationSet.create(doc, decorations);
}

//TODO: This seems to be a pretty well-worn pattern for decorations - could abstract?
const stackSnippetRichTextDecoratorPlugin = (opts: StackSnippetOptions) => {
    return new AsyncPlugin<StackSnippetState, FetchCompiledSnippetResult[]>({
        key: STACK_SNIPPET_KEY,
        asyncCallback: (view, prevState) => {
            return fetchSnippetResult(view, prevState, opts);
        },
        state: {
            init(_, state) {
                return {
                    decorations: generateAllDecorations(state),
                };
            },
            apply(tr, value) {
                // only update the decorations if they changed at all
                const callbackData = this.getCallbackData(tr);
                if (callbackData) {
                    // make sure the positions are up to date with any changes
                    const updatedData = callbackData.map((d) => ({
                        ...d,
                        pos: tr.mapping.map(d.pos),
                    }));
                    return {
                        decorations: generateRecentChangeDecorations(
                            tr.doc,
                            updatedData
                        ),
                        recentlyUpdated: updatedData,
                    };
                }

                // else update the mappings to their new positions in the doc
                return {
                    decorations: value.decorations.map(tr.mapping, tr.doc),
                };
            },
        },
        props: {
            decorations(state) {
                return this.getState(state).decorations;
            },
        },
        appendTransaction(trs, _, newState) {
            const data = STACK_SNIPPET_KEY.getState(newState);

            //If nothing's updated, there's nothing to do.
            if (!data.recentlyUpdated?.length) {
                return null;
            }

            let tr: Transaction = null;

            data.recentlyUpdated.forEach((n) => {
                log("Stack Snippet trasaction handler - generated content", n);
                if (!n.content?.textContent) {
                    return;
                }

                // let pos = n.pos;
                // trs.forEach((t) => {
                //     pos = t.mapping.map(pos);
                // });
                //
                // const schema = newState.schema;
                // const newNode = schema.text(n.content.textContent, [
                //     schema.marks.link.create({ href: n.href, markup: null }),
                // ]);
                //
                // const node = newState.doc.nodeAt(pos);
                //
                // const nodeSize = node.nodeSize;
                //
                // tr = (tr || newState.tr).replaceWith(
                //     pos,
                //     pos + nodeSize,
                //     newNode
                // );
            });

            return tr;
        },
    });
};

export const stackSnippetPlugin: EditorPlugin<CommonViewOptions> = (opts) => ({
    markdown: {
        parser: {
            stack_snippet: {
                block: "stack_snippet",
                getAttrs: (tok: Token) => ({
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
        },
        serializers: {
            nodes: {
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
            },
            marks: {},
        },
        alterMarkdownIt: (mdit) => {
            mdit.use((md: MarkdownIt) => {
                md.block.ruler.before(
                    "fence",
                    "stack_snippet",
                    parseSnippetBlock
                );
            });
        },
    },
    extendSchema: (schema) => {
        schema.nodes = schema.nodes
            .addToEnd("stack_snippet", {
                //It can have exactly 3 lang blocks: html, css, js.
                // These look the same, and I don't think we need to be picky about order.
                content:
                    "stack_snippet_lang stack_snippet_lang stack_snippet_lang",
                group: "block",
                selectable: false,
                inline: false,
                defining: true,
                isolating: true,
                attrs: {
                    hide: { default: "null" },
                    console: { default: "null" },
                    babel: { default: "null" },
                    babelPresetReact: { default: "null" },
                    babelPresetTS: { default: "null" },
                },
                toDOM() {
                    return [
                        "div",
                        { class: "snippet" },
                        ["div", { class: "snippet-code" }, 0],
                    ];
                },
            })
            .addToEnd("stack_snippet_lang", {
                content: "text*",
                code: true,
                defining: true,
                isolating: true,
                inline: false,
                attrs: {
                    language: {
                        default: "",
                        validate: (value) => {
                            if (typeof value !== "string") {
                                return false;
                            }
                            return ["js", "css", "html"].includes(value);
                        },
                    },
                },
                toDOM(node) {
                    const rawLang: unknown = node.attrs.language;
                    let language = "";
                    if (rawLang && typeof rawLang == "string") {
                        language = rawLang;
                    }
                    return [
                        "pre",
                        {
                            class: `prettyprint-override snippet-code-${language} lang-${language}`,
                        },
                        ["code", 0],
                    ];
                },
            });
        return schema;
    },
    richText: {
        plugins: [stackSnippetRichTextDecoratorPlugin(opts.stackSnippet)],
    },
});
