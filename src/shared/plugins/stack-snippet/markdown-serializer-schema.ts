import {MarkdownSerializerNodes} from "../../markdown-serializer";
import {Node} from "prosemirror-model";

const assertAttrValue = (node: Node, attrName: string): string => {
    const attr: unknown = node.attrs[attrName];
    if(!attr){
        return "null";
    }
    if(typeof attr != "string"){
        return "null";
    }
    return attr;
}

export const stackSnippetSerializerNodes: MarkdownSerializerNodes = {
    stack_snippet(state, node) {
        const hide = assertAttrValue(node, "hide");
        const consoleAttr = assertAttrValue(node, "console");
        const babel = assertAttrValue(node, "babel");
        const babelPresetReact = assertAttrValue(node, "babelPresetReact");
        const babelPresetTS = assertAttrValue(node, "babelPresetTS");
        state.write(`<!-- begin snippet: js hide: ${hide} console: ${consoleAttr} babel: ${babel} babelPresetReact: ${babelPresetReact} babelPresetTS: ${babelPresetTS} -->`)
        state.write("\n\n");
        node.forEach((langNode) => {
            const language = assertAttrValue(langNode, "language");
            state.write(`<!-- language: lang-${language} -->\n\n`)
            //Snippets expects a very specific format; no extra padding on empty lines
            // but the code itself needs padded with 4 spaces.
            const spacedContent = langNode.textContent
                .split('\n')
                .map(l => l !== "" ? "    " + l : l);
            for(let i = 0; i < spacedContent.length; i++){
                state.write(spacedContent[i] + "\n");
            }
            state.write("\n");
        });
        state.write("<!-- end snippet -->")
        state.closeBlock(node);
    }
}
