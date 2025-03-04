import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import {
    AsyncPlugin,
    AsyncPluginKey,
} from "../../prosemirror-plugins/plugin-extensions";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Md5 } from "ts-md5";
import { docNodeChanged } from "../../utils";
import { log } from "../../logger";
import {
    getSnippetMetadata,
    SnippetMetadata,
    StackSnippetOptions,
} from "./common";

/** The cache of a snippet's hash -> content for executed snippet content so we don't have to continually refetch */
const snippetResultCache: { [hash: string]: Node } = {};

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
    ctas.className = "snippet-ctas";

    //TODO: todo
    const todo = document.createElement("p");
    todo.textContent = "TODO: Make this some buttons";
    ctas.appendChild(todo);

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
            content: snippetResultCache[hash],
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
export const stackSnippetRichTextDecoratorPlugin = (
    opts: StackSnippetOptions
) => {
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
