import { Node as ProsemirrorNode } from "prosemirror-model";
import { Utils } from "../../../../src";

export interface StackSnippetOptions {
    /** The async function to render the preview */
    renderer: (
        meta: SnippetMetadata,
        js?: string,
        css?: string,
        html?: string
    ) => Promise<Node | null>;

    /** Function to trigger opening of the snippets Modal */
    openSnippetsModal: (
        meta?: SnippetMetadata,
        js?: string,
        css?: string,
        html?: string
    ) => void;
}

export interface SnippetMetadata {
    id: string;
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
    if (!node || node.type.name !== "stack_snippet") return null;

    const id =
        node.attrs["id"] && typeof node.attrs["id"] == "string"
            ? node.attrs["id"]
            : Utils.generateRandomId();
    const hide = assertAttrValue(node, "hide");
    const consoleAttr = assertAttrValue(node, "console");
    const babel = assertAttrValue(node, "babel");
    const babelPresetReact = assertAttrValue(node, "babelPresetReact");
    const babelPresetTS = assertAttrValue(node, "babelPresetTS");

    const langNodes: LanguageNode[] = [];
    node.descendants((l) => {
        if (l.type.name == "stack_snippet_lang") {
            const langNode = getLanguageNode(l);
            if (langNode) {
                langNodes.push(langNode);
            }
            return false;
        }
        return true;
    });

    return {
        id,
        hide,
        console: consoleAttr,
        babel,
        babelPresetReact,
        babelPresetTS,
        langNodes,
    };
};

const getLanguageNode = (node: ProsemirrorNode): LanguageNode | null => {
    if (node.type.name == "stack_snippet_lang") {
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

export const validSnippetRegex =
    /^<!-- (?:begin snippet:|end snippet |language:)(.*)-->$/;
const langSnippetRegex = /^<!-- language: lang-(?<lang>css|html|js) -->/;
//Match the start snippet. Original editor is not order resilient.
const startSnippetRegex =
    /^<!-- begin snippet: js (?:hide: (?<hide>(?:true|false|null))\s)(?:console: (?<console>(?:true|false|null))\s)(?:babel: (?<babel>(?:true|false|null))\s)(?:babelPresetReact: (?<babelPresetReact>(?:true|false|null))\s)(?:babelPresetTS: (?<babelPresetTS>(?:true|false|null))\s)-->/;

export interface RawContext {
    line: string;
    index: number;
}

interface BaseMetaLine {
    type: "begin" | "end" | "lang";
    index: number;
}

export interface BeginMetaLine extends BaseMetaLine {
    type: "begin";
    //Strictly speaking these are `boolean | null`, but they don't affect operation
    babel: string;
    babelPresetReact: string;
    babelPresetTS: string;
    console: string;
    hide: string;
}

export interface EndMetaLine extends BaseMetaLine {
    type: "end";
}

export interface LangMetaLine extends BaseMetaLine {
    type: "lang";
    language: string;
}

export type MetaLine = BeginMetaLine | EndMetaLine | LangMetaLine;

export const mapMetaLine = (rawContext: RawContext): MetaLine | null => {
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

export const validateMetaLines = (metaLines: MetaLine[]): ValidationResult => {
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
                    default:
                        return {
                            valid: false,
                            reason: "Unknown language block",
                        };
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

    if (
        !validationResult.jsIndex &&
        !validationResult.cssIndex &&
        !validationResult.htmlIndex
    ) {
        validationResult.valid = false;
        validationResult.reason = "No code block found";
        return validationResult;
    }

    if (validationResult.beginIndex > validationResult.endIndex) {
        validationResult.valid = false;
        validationResult.reason = "Start/end not in correct order";
        return validationResult;
    }

    const sortedIndices = [
        validationResult.beginIndex,
        validationResult.jsIndex,
        validationResult.cssIndex,
        validationResult.htmlIndex,
        validationResult.endIndex,
    ]
        .filter((i) => i !== undefined) //filter out any undefineds; we don't care about the,
        .sort((a, b) => (a == b ? 0 : a > b ? 1 : -1)); //sort them in numerical order

    if (
        sortedIndices[0] !== validationResult.beginIndex ||
        sortedIndices[sortedIndices.length - 1] !== validationResult.endIndex
    ) {
        validationResult.valid = false;
        validationResult.reason = "Language blocks not within begin/end blocks";
        return validationResult;
    }

    return validationResult;
};
