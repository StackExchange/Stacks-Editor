import {EditorState, Transaction} from "prosemirror-state";
import {EditorView} from "prosemirror-view";
import {schema} from "prosemirror-markdown";
import {Node} from "prosemirror-model";
import {log} from "../../shared/logger";
import {MenuCommand} from "../../shared/menu";

export const runCodeBlockCommand: MenuCommand = (
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view?: EditorView
): boolean => {
    const { from, to } = state.selection;
    let isCodeblock = false;
    let codeBlockNode: Node;

    state.doc.nodesBetween(from, to, (node) => {
        isCodeblock = node.type.name === schema.nodes.code_block.name;
        codeBlockNode = node;
        return !isCodeblock;
    });

    if(!isCodeblock){
        return false;
    }

    //Time to run some code boys
    if(dispatch) {
        const sourceCode = codeBlockNode.textContent;//.replace(/"/g, '\\"');
        log("runCodeBlockCommand - codeblock source", sourceCode)

        //TODO: Hey, probs should move this out to a Stack owned server first.
        //TODO - in fact... CORS will fuck you immediately doing this.
        fetch("/api/v4/submissions?access_token=<TOKEN>",{
            method: "POST",
            headers: {
                "content-type": "application/json;charset=UTF-8",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                "compilerId": 86,
                "compilerVersionId": 7,
                "source": sourceCode
            })
        })
        .then((res) => res.json())
        .then((data) => {
            log("runCodeBlockCommand submission result!", data)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            return data.id as number;
        })
        .then((subId) => {
            //wait 3 secs
            return new Promise(resolve => setTimeout(() => resolve(subId), 8000))
        })
        .then((subId: number) => fetch(`/api/v4/submissions/${subId}?access_token=<TOKEN>`, {
            headers: {
                "Access-Control-Allow-Origin": "*"
            }
        }))
        .then((res) => res.json())
        .then((data) => {
            log("runCodeBlockCommand execution result!", data)
            //Essentially, Is this done, is it finished, and do we have a place to grab the result?
            if(!data.executing && data.result.status.code == 15 && data.result.streams.output.uri){
                const fetchUri: string = data.result.streams.output.uri.slice(44);
                log(`runCodeBlockCommand result uri ${fetchUri}`);
                return fetch(fetchUri, {
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    }
                });
            }
            return new Response(JSON.stringify({error: "no results"}));
        })
        .then((res) => res.text())
        .then((data) => {
            log(`runCodeBlockCommand result`, data)
        })
        .catch(err => log("runCodeBlockCommand err", err))
    }
    return true;
}
