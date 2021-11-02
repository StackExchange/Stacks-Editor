import { Node as ProsemirrorNode } from "prosemirror-model";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import {
    AsyncPlugin,
    AsyncPluginKey,
} from "../../shared/prosemirror-plugins/plugin-extensions";

// TODO naive cache, maybe we can improve?
// TODO maybe we can prefill the cache if the consuming process already has the result
/** The cache of url -> content for link previews so we don't have to continually refetch */
const fullPreviewResultCache: { [url: string]: Node } = {};

/** The cache of URL -> the node information we need to be able to replace it when the link text
 * Note that unlike `fullPreviewResultCache`, URLs are removed from this one after replacement takes place
 * in order to support multiple replacements of the same URL.
 *
 * // TODO: Maybe this should be a mapping of URL to array of nodes? There are still a few quirks with
 * pasting multiple copies of the same URL.
 */
const textOnlyPreviewResultCache: {
    [url: string]: {
        content: Node;
        unrendered: { node: ProsemirrorNode; pos: number }[];
    };
} = {};

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
): { url: string; provider: LinkPreviewProvider } {
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
 * TODO this needs to be as fast as possible - can we do old vs new state comparison to restrict the nodes we search?
 * Gets nodes in the document that are able to be resolved by a preview provider
 * @param doc The document to search through
 * @param providers The list of registered providers
 */
function getValidNodes(doc: ProsemirrorNode, providers: LinkPreviewProvider[]) {
    const validNodes: {
        provider: { url: string; provider: LinkPreviewProvider };
        pos: number;
        node: ProsemirrorNode;
    }[] = [];

    // iterate over document structure
    doc.descendants((node, pos) => {
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
function generatePreviewDecorations(
    doc: ProsemirrorNode,
    providers: LinkPreviewProvider[]
) {
    const linkPreviewDecorations: Decoration[] = [];

    const nodes = getValidNodes(doc, providers);

    nodes.forEach((n) => {
        if (
            !n.provider.provider.textOnly &&
            n.provider.url in fullPreviewResultCache
        ) {
            // if the url is in the cache, insert the link preview
            linkPreviewDecorations.push(
                insertLinkPreview(n.pos, fullPreviewResultCache[n.provider.url])
            );
        } else {
            // otherwise, add the loading styles
            linkPreviewDecorations.push(
                Decoration.node(n.pos, n.pos + n.node.nodeSize, {
                    class: "is-loading",
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
    // TODO make this look nice
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

    return hasOnlyOneChild && childIsTextNode && childHasLinkMark;
}

interface FetchLinkPreviewResult {
    previouslyCached: boolean;
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
    providers: LinkPreviewProvider[]
): Promise<FetchLinkPreviewResult[]> {
    // TODO can we make this more efficient?
    // getValidNodes will run on every state update, so it'd be
    // nice to be able to check the last transaction / updated doc
    // instead of the current snapshot

    const nodes = getValidNodes(view.state.doc, providers);

    // if there's new nodes to render, just reject (no need to update the state)
    if (!nodes.length) {
        return Promise.reject(null);
    }

    // TODO DOCUMENT AND CLEANUP THIS MESS!
    const promises = nodes.map((n) => {
        const previouslyCached =
            n.provider.url in fullPreviewResultCache ||
            n.provider.url in textOnlyPreviewResultCache;
        const cachedContent =
            fullPreviewResultCache[n.provider.url] ||
            textOnlyPreviewResultCache[n.provider.url]?.content ||
            null;
        const basePromise = previouslyCached
            ? Promise.resolve(cachedContent)
            : n.provider.provider.renderer(n.provider.url);

        const output: FetchLinkPreviewResult & {
            promise?: Promise<FetchLinkPreviewResult>;
        } = {
            previouslyCached,
            pos: n.pos,
            content: cachedContent,
            isTextOnly: n.provider.provider.textOnly,
            href: n.provider.url,
        };

        const promise = basePromise
            .then((content) => {
                // cache results so we don't call over and over...
                const isTextOnly = n.provider.provider.textOnly;
                if (isTextOnly && !textOnlyPreviewResultCache[n.provider.url]) {
                    textOnlyPreviewResultCache[n.provider.url] = {
                        content,
                        unrendered: [{ node: n.node, pos: n.pos }],
                    };
                } else if (isTextOnly) {
                    textOnlyPreviewResultCache[n.provider.url].unrendered.push({
                        node: n.node,
                        pos: n.pos,
                    });
                } else {
                    fullPreviewResultCache[n.provider.url] = content;
                }

                return {
                    previouslyCached,
                    content,
                    isTextOnly,
                    href: n.provider.url,
                    pos: n.pos,
                };
            })
            // don't let any errors crash our `.all` below
            // "catch" and fake a resolution
            .catch(() => {
                // TODO make this look nice
                // TODO: error handling for text only previews? So far we just reject the promise
                // without sending any errors back, so this should be okay for the time being.
                const errorPlaceholder = document.createElement("div");
                errorPlaceholder.innerText = "Error fetching content.";
                // set the cache here too, so we don't refetch errors every time...
                fullPreviewResultCache[n.provider.url] = errorPlaceholder;
                return Promise.resolve(<FetchLinkPreviewResult>{});
            });

        output.promise = promise;

        return output;
    });

    // trigger the rendering immediately
    LINK_PREVIEWS_KEY.dispatchCallbackData(view, promises);

    return Promise.all(promises.map((p) => p.promise));
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
        asyncCallback: (view) => {
            return fetchLinkPreviewContent(view, previewProviders);
        },
        state: {
            init(_, { doc }) {
                return {
                    decorations: generatePreviewDecorations(
                        doc,
                        previewProviders
                    ),
                };
            },
            apply(tr, value) {
                // only update the decorations if they changed at all
                const callbackData = this.getCallbackData(tr);
                if (callbackData) {
                    return {
                        decorations: generatePreviewDecorations(
                            tr.doc,
                            previewProviders
                        ),
                        handleTextOnly: callbackData.some((d) => d.isTextOnly),
                        recentlyUpdated: callbackData,
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
                if (!n.content?.textContent) {
                    return;
                }

                // TODO easier way to do this? use newState?
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
