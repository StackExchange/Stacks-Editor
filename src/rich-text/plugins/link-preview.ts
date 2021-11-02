import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import {
    AsyncPlugin,
    AsyncPluginKey,
} from "../../shared/prosemirror-plugins/plugin-extensions";
import { docNodeChanged } from "../../shared/utils";

/** The cache of url -> content for link previews so we don't have to continually refetch */
const previewResultCache: { [url: string]: Node } = {};

/**
 * Interface to describe a link preview provider for registering/fetching previews from urls
 */
export interface LinkPreviewProvider {
    /** A regular expression to test against a url to see if this provider should handle it */
    domainTest: RegExp;
    /** The async function to render the preview */
    renderer: (url: string) => Promise<Node | null>;
    /** Whether to update the link's text content only or do a full rich html decoration */
    textOnly?: boolean;
}

/**
 * Gets the first valid provider for a node from all registered providers
 * @param providers All registered providers
 * @param node The node to check for applicable links to match to the registered providers
 */
function getValidProvider(
    providers: LinkPreviewProvider[],
    node: ProsemirrorNode
): { url: string; provider: LinkPreviewProvider } | null {
    const n = node.isText ? node : node.content.firstChild;
    const url = n?.marks.find((m) => m.type.name === "link")?.attrs
        ?.href as string;

    // if there is no href, then nothing will match
    if (!url) {
        return null;
    }

    // check all providers for this
    for (const provider of providers) {
        // full preview providers require links to be in a paragraph by themselves
        if (!provider.textOnly && !isStandalonePreviewableLink(node)) {
            continue;
        }

        // text only providers must be matched to text nodes
        if (provider.textOnly && !node.isText) {
            continue;
        }

        // Text-only provider could apply but this link already has a custom text,
        // so skip it
        if (provider.textOnly && url !== n?.textContent) {
            continue;
        }

        if (provider.domainTest && provider.domainTest.test(url)) {
            return { url, provider };
        }
    }

    return null;
}

/**
 * Gets nodes in the document that are able to be resolved by a preview provider
 * @param doc The document to search through
 * @param providers The list of registered providers
 */
function getValidNodes(
    currState: EditorState,
    prevState: EditorState,
    providers: LinkPreviewProvider[]
) {
    // if the document didn't change, then we don't need to do anything
    // TODO can we do one step better and get only the added nodes?
    if (!docNodeChanged(currState, prevState)) {
        return;
    }

    const validNodes: {
        provider: { url: string; provider: LinkPreviewProvider };
        pos: number;
        node: ProsemirrorNode;
    }[] = [];

    // iterate over current document structure
    currState.doc.descendants((node, pos) => {
        const provider = getValidProvider(providers, node);

        if (provider) {
            validNodes.push({ provider, pos, node });

            // no need to go into this node's descendants
            return false;
        }
    });

    return validNodes;
}

/**
 * Run over the entire document and find all previewable links and create a link preview decoration
 * for each.
 * @param {Document} doc - The document to find previewable link candidates in
 */
function generateAllPreviewDecorations(
    state: EditorState,
    providers: LinkPreviewProvider[]
) {
    const nodes = getValidNodes(state, null, providers);
    const mapped: FetchLinkPreviewResult[] = nodes.map((n) => {
        return {
            content: previewResultCache[n.provider.url],
            href: n.provider.url,
            isTextOnly: n.provider.provider.textOnly,
            pos: n.pos,
        };
    });

    return generateRecentPreviewDecorations(state.doc, mapped);
}

/**
 * Create a link preview decorations for a set of specific link preview results.
 * @param {Document} doc - The document to generate decorations against
 */
function generateRecentPreviewDecorations(
    doc: ProsemirrorNode,
    recentlyUpdated: FetchLinkPreviewResult[]
) {
    const linkPreviewDecorations: Decoration[] = [];

    recentlyUpdated.forEach((n) => {
        if (!n.isTextOnly && n.content) {
            // if the url is in the cache, insert the link preview
            linkPreviewDecorations.push(insertLinkPreview(n.pos, n.content));
        } else {
            const node = doc.nodeAt(n.pos);
            // otherwise, add the loading styles
            linkPreviewDecorations.push(
                Decoration.node(n.pos, n.pos + node.nodeSize, {
                    class: "is-loading js-link-preview-loading",
                    title: "Loading...",
                })
            );
        }
    });

    return DecorationSet.create(doc, linkPreviewDecorations);
}

/**
 * Inserts the link preview's content into the link's decoration/placeholder
 * @param placeholder The placeholder originally created to house this content
 * @param content The content returned from the link preview to insert
 */
function insertLinkPreview(pos: number, content: Node | null) {
    const placeholder = document.createElement("div");

    // give this a targetable class for external use / e2e testing
    placeholder.className = "js-link-preview-decoration";

    if (content) {
        placeholder.appendChild(content.cloneNode(true));
    }

    return Decoration.widget(pos, placeholder);
}

/**
 * Figure out if a given node in the document is a candidate for a link preview.
 * This will find all paragraphs that consist only of a link and nothing else.
 *
 * @param {Node} node - The node that should be checked
 */
function isStandalonePreviewableLink(node: ProsemirrorNode) {
    const child = node.content.firstChild;
    if (!child) return false;

    const hasOnlyOneChild = node.childCount === 1;
    const childIsTextNode = child.type.name === "text";
    const childHasLinkMark = child.marks.some(
        (mark) => mark.type.name === "link"
    );

    // TODO don't return true if the preview has already rendered

    return hasOnlyOneChild && childIsTextNode && childHasLinkMark;
}

interface FetchLinkPreviewResult {
    content: Node | null;
    isTextOnly: boolean;
    pos: number;
    href: string;
}

/**
 * Fetches and caches all link preview content for every link node in the view
 * @param view The view to search for valid link nodes
 * @param providers The list of registered providers
 */
function fetchLinkPreviewContent(
    view: EditorView,
    prevState: EditorState,
    providers: LinkPreviewProvider[]
): Promise<FetchLinkPreviewResult[]> {
    // TODO can we make this more efficient?
    // getValidNodes will run on every state update, so it'd be
    // nice to be able to check the last transaction / updated doc
    // instead of the current snapshot
    const nodes = getValidNodes(view.state, prevState, providers);

    // if there's no new nodes to render, just reject (no need to update the state)
    if (!nodes.length) {
        return Promise.reject(null);
    }

    const results = nodes.map((n) => {
        const previouslyCached = n.provider.url in previewResultCache;
        const cachedContent = previewResultCache[n.provider.url] || null;

        // if the content is already cached, don't call the renderer again
        const basePromise = previouslyCached
            ? Promise.resolve(cachedContent)
            : n.provider.provider.renderer(n.provider.url);

        const output: FetchLinkPreviewResult & {
            promise?: Promise<FetchLinkPreviewResult>;
        } = {
            pos: n.pos,
            content: cachedContent,
            isTextOnly: n.provider.provider.textOnly,
            href: n.provider.url,
        };

        const promise = basePromise
            .then((content) => {
                // cache results so we don't call over and over...
                previewResultCache[n.provider.url] = content;

                return {
                    content,
                    isTextOnly: n.provider.provider.textOnly,
                    href: n.provider.url,
                    pos: n.pos,
                };
            })
            // don't let any errors crash our `.all` below
            // "catch" and fake a resolution
            .catch(() => {
                // TODO make this look nice
                const errorPlaceholder = document.createElement("div");
                errorPlaceholder.innerText = "Error fetching content.";
                // set the cache here too, so we don't refetch errors every time...
                previewResultCache[n.provider.url] = errorPlaceholder;
                return Promise.resolve(<FetchLinkPreviewResult>{});
            });

        output.promise = promise;

        return output;
    });

    // trigger the rendering immediately
    LINK_PREVIEWS_KEY.dispatchCallbackData(view, results);

    return Promise.all(results.map((p) => p.promise));
}

interface LinkPreviewState {
    decorations: DecorationSet;
    recentlyUpdated?: FetchLinkPreviewResult[];
}

const LINK_PREVIEWS_KEY = new AsyncPluginKey<
    LinkPreviewState,
    FetchLinkPreviewResult[]
>("linkPreviews");

/**
 * Creates a plugin that searches the entire document for potentially previewable links
 * and creates a widget decoration to render the link preview in.
 */
export function linkPreviewPlugin(
    providers: LinkPreviewProvider[]
): AsyncPlugin<LinkPreviewState, FetchLinkPreviewResult[]> {
    const previewProviders = providers || [];

    return new AsyncPlugin<LinkPreviewState, FetchLinkPreviewResult[]>({
        key: LINK_PREVIEWS_KEY,
        asyncCallback: (view, prevState) => {
            return fetchLinkPreviewContent(view, prevState, previewProviders);
        },
        state: {
            init(_, state) {
                return {
                    decorations: generateAllPreviewDecorations(
                        state,
                        previewProviders
                    ),
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
                        decorations: generateRecentPreviewDecorations(
                            tr.doc,
                            updatedData
                        ),
                        handleTextOnly: updatedData.some((d) => d.isTextOnly),
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
            const data = LINK_PREVIEWS_KEY.getState(newState);

            // if no nodes were added or if there aren't any textOnly nodes added, return
            if (
                !data.recentlyUpdated?.length ||
                !data.recentlyUpdated.some((d) => d.isTextOnly)
            ) {
                return null;
            }

            let tr = newState.tr;

            data.recentlyUpdated.forEach((n) => {
                if (!n.content?.textContent || !n.isTextOnly) {
                    return;
                }

                let pos = n.pos;
                trs.forEach((t) => {
                    pos = t.mapping.map(pos);
                });

                const schema = newState.schema;
                const newNode = schema.text(n.content.textContent, [
                    schema.marks.link.create({ href: n.href, markup: null }),
                ]);

                const node = newState.doc.nodeAt(pos);

                const nodeSize = node.nodeSize;

                tr = tr.replaceWith(pos, pos + nodeSize, newNode);
            });

            return tr;
        },
    });
}
