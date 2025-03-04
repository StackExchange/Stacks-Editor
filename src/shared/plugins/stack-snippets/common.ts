import { Node as ProsemirrorNode } from "prosemirror-model";

export interface StackSnippetOptions {
    /** The async function to render the preview */
    renderer: (
        meta: SnippetMetadata,
        js?: string,
        css?: string,
        html?: string
    ) => Promise<Node | null>;
}

export interface SnippetMetadata {
    hide: string;
    console: string;
    babel: string;
    babelPresetReact: string;
    babelPresetTS: string;
    langNodes: LanguageNode[];
}

export interface LanguageMetadata {
    language: string;
}
export interface LanguageNode {
    metaData: LanguageMetadata;
    content: string;
}

export const assertAttrValue = (
    node: ProsemirrorNode,
    attrName: string
): string => {
    const attr: unknown = node.attrs[attrName];
    if (!attr) {
        return "null";
    }
    if (typeof attr != "string") {
        return "null";
    }
    return attr;
};

export const getSnippetMetadata = (
    node: ProsemirrorNode
): SnippetMetadata | null => {
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
