import { MenuCommand } from "../../../../src";
import {
    getSnippetMetadata,
    SnippetMetadata,
    StackSnippetOptions,
} from "./common";
import { Node } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { BASE_VIEW_KEY } from "../../../../src/shared/prosemirror-plugins/base-view-state";
import { EditorState } from "prosemirror-state";
import { caseNormalizeKeymap } from "../../../../src/shared/prosemirror-plugins/case-normalize-keymap";

/** Builds a function that will update a snippet node on the up-to-date state (at time of execution) **/
function buildUpdateDocumentCallback(view: EditorView) {
    return (markdown: string, id?: SnippetMetadata["id"]): void => {
        //Search for the id
        let identifiedNode: Node;
        let identifiedPos: number;
        if (id !== undefined) {
            view.state.doc.descendants((node, pos) => {
                if (node.type.name == "stack_snippet" && node.attrs?.id == id) {
                    identifiedNode = node;
                    identifiedPos = pos;
                }

                //We never want to delve into children
                return false;
            });
        }

        //Get an entrypoint into the BaseView we're in currently
        const { baseView } = BASE_VIEW_KEY.getState(view.state);

        //We didn't find something to replace, so we're inserting it
        if (!identifiedNode) {
            baseView.appendContent(markdown);
        } else {
            //Parse the incoming markdown as a Prosemirror node using the same entry point as everything else
            // (this makes sure there's a single pathway for parsing content)
            const parsedNodeDoc: Node = baseView.parseContent(markdown);
            let node: Node;
            if (parsedNodeDoc.childCount != 1) {
                //There's been a parsing error. Put the whole doc in it's place.
                node = parsedNodeDoc;
            } else {
                //The parsed node has a new ID, but we want to maintain it.
                // That said, we can only amend Attrs on a rendered node, but doing so makes for a busy
                // transaction dispatch history
                //Solution: Reparse the node, amending the JSON inbetween.
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const snippetNodeJson = parsedNodeDoc.firstChild.toJSON();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                snippetNodeJson.attrs.id = id;
                node = Node.fromJSON(view.state.schema, snippetNodeJson);
            }

            view.dispatch(
                view.state.tr.replaceWith(
                    identifiedPos,
                    identifiedPos + identifiedNode.nodeSize,
                    node
                )
            );
        }
    };
}

export function openSnippetModal(options?: StackSnippetOptions): MenuCommand {
    return (state, dispatch, view): boolean => {
        //If we have no means of opening a modal, reject immediately
        if (!options || options.openSnippetsModal == undefined) {
            return false;
        }

        //Despite not dispatching anything internally, this is used to show the event _actually_ firing or not
        if (!dispatch) return true;

        let discoveredSnippets: Node[] = [];
        state.doc.nodesBetween(
            state.selection.from,
            state.selection.to,
            (node) => {
                if (node.type.name == "stack_snippet") {
                    discoveredSnippets = [...discoveredSnippets, node];
                }

                //We only need to capture top level nodes
                return false;
            }
        );

        //Just grab the first node highlighted and dispatch that. If not, dispatch nothing
        if (discoveredSnippets.length == 0) {
            //Fire the open modal handler with nothing
            options.openSnippetsModal(buildUpdateDocumentCallback(view));
            return true;
        }

        const snippetMetadata = getSnippetMetadata(discoveredSnippets[0]);
        const [js] = snippetMetadata.langNodes.filter(
            (l) => l.metaData.language == "js"
        );
        const [css] = snippetMetadata.langNodes.filter(
            (l) => l.metaData.language == "css"
        );
        const [html] = snippetMetadata.langNodes.filter(
            (l) => l.metaData.language == "html"
        );

        options.openSnippetsModal(
            buildUpdateDocumentCallback(view),
            snippetMetadata,
            js?.content,
            css?.content,
            html?.content
        );
        return true;
    };
}

const swallowSnippetCommand = (state: EditorState): boolean => {
    const fromNodeType = state.selection.$from.node().type.name;

    if(fromNodeType === "stack_snippet" || fromNodeType === "stack_snippet_lang"){
        return true;
    }
}

export const swallowedCommandList = {
    "Mod-Enter": swallowSnippetCommand,
    "Shift-Enter": swallowSnippetCommand,
    "Mod-r": swallowSnippetCommand,
};

/**
 * Snippets are comprised of a container around customized codeblocks. Some of the default behaviour for key-binds makes them behave
 * very strangely.
 *
 * In these cases, we override the command to (contextually) do nothing if the current context is a snippet
 *   This is possible because returning truthy consumes the event.
 * **/
export const stackSnippetCommandRedactor = caseNormalizeKeymap(swallowedCommandList);
