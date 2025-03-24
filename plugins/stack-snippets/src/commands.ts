import { MenuCommand } from "../../../src/shared/menu";
import { getSnippetMetadata, StackSnippetOptions } from "./common";
import { Node } from "prosemirror-model";

export function openSnippetModal(options: StackSnippetOptions): MenuCommand {
    return (state, dispatch): boolean => {
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
            options.openSnippetsModal();
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
            snippetMetadata,
            js?.content,
            css?.content,
            html?.content
        );
        return true;
    };
}
