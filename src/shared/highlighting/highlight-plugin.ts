import { highlightPlugin } from "prosemirror-highlightjs";
import { Node as ProsemirrorNode } from "prosemirror-model";
import { Plugin, Transaction } from "prosemirror-state";
import { getHljsInstance } from "./hljs-instance";
import { RichTextOptions } from "../../rich-text/editor";

/*
 * Register the languages we're going to use here so we can strongly type our inputs
 */
//TODO missing: regex
type Language =
    | "markdown"
    | "bash"
    | "cpp"
    | "csharp"
    | "coffeescript"
    | "xml"
    | "java"
    | "json"
    | "perl"
    | "python"
    | "ruby"
    | "clojure"
    | "css"
    | "dart"
    | "erlang"
    | "go"
    | "haskell"
    | "javascript"
    | "kotlin"
    | "tex"
    | "lisp"
    | "scheme"
    | "lua"
    | "matlab"
    | "mathematica"
    | "ocaml"
    | "pascal"
    | "protobuf"
    | "r"
    | "rust"
    | "scala"
    | "sql"
    | "swift"
    | "vhdl"
    | "vbscript"
    | "yml"
    | "none";

// Aliases are neatly grouped onto the same line, so tell prettier not to format
// prettier-ignore
/**
 * A mapping of all known language aliases to their proper definition name
 * @see https://meta.stackexchange.com/questions/184108/what-is-syntax-highlighting-and-how-does-it-work
 */
const languageAliases: { [key: string]: string } = {
    bsh: "bash", csh: "bash", sh: "bash",
    // TODO is cpp appropriate or is there a better c-like?
    c: "cpp", cc: "cpp", cxx: "cpp", cyc: "cpp", m: "cpp",
    cs: "csharp",
    coffee: "coffeescript",
    html: "xml", xsl: "xml",
    js: "javascript",
    pl: "perl",
    py: "python", cv: "python",
    rb: "ruby",
    clj: "clojure",
    erl: "erlang",
    hs: "haskell",
    mma: "mathematica",
    tex: "latex",
    cl: "lisp", el: "lisp", lsp: "lisp", scm: "scheme", ss: "scheme", rkt: "scheme",
    fs: "ocaml", ml: "ocaml",
    s: "r",
    rc: "rust", rs: "rust",
    vhd: "vhdl",
    none: "plaintext"
};

/**
 * Attempts to dealias a language's name into a name we can load/register under
 * @param rawLanguage
 */
function dealiasLanguage(rawLanguage: string): Language {
    return (languageAliases[rawLanguage] || rawLanguage) as Language;
}

/**
 * Gets the language string from a code_block node, if one was specified
 * @param block The block to get the language string from
 */
function getSpecifiedBlockLanguage(block: ProsemirrorNode): string {
    // commonmark spec suggests that the "first word" in a fence's info string is the language
    // https://spec.commonmark.org/0.29/#info-string
    // https://spec.commonmark.org/0.29/#example-112
    const rawInfoString =
        (block.attrs.params as string) ||
        (block.attrs.language as string) ||
        "";
    const rawLanguage = rawInfoString.split(/\s/)[0].toLowerCase() || null;

    // attempt to dealias the language before sending out to the highlighter
    return dealiasLanguage(rawLanguage);
}

/**
 * Gets the language string from a code_block node, returning the auto-detected language if one wasn't specified
 * @param block The block to get the language string from
 */
export function getBlockLanguage(block: ProsemirrorNode): {
    Language: string;
    IsAutoDetected: boolean;
} {
    // if a language has been specified with three backticks, use that
    const specifiedLanguage = getSpecifiedBlockLanguage(block);
    if (specifiedLanguage)
        return { Language: specifiedLanguage, IsAutoDetected: false };

    // otherwise use the cached autodetected language
    return {
        Language: block.attrs.autodetectedLanguage as string,
        IsAutoDetected: true,
    };
}

/**
 * Plugin that highlights all code within all code_blocks in the parent
 */
export function CodeBlockHighlightPlugin(
    options: RichTextOptions["highlighting"]
): Plugin {
    const extractor = (block: ProsemirrorNode) =>
        getBlockLanguage(block).Language;

    const setter = (
        tr: Transaction,
        node: ProsemirrorNode,
        pos: number,
        language: string
    ): Transaction => {
        const attrs = { ...node.attrs };

        attrs["autodetectedLanguage"] = language;

        return tr.setNodeMarkup(pos, undefined, attrs);
    };

    const hljs = getHljsInstance();

    // if hljs fails to instantiate (optional dependency), don't crash the entire editor
    if (!hljs) {
        return new Plugin({});
    }

    const affectedNodes = [
        "code_block",
        ...(options?.highlightedNodeTypes || []),
    ];

    return highlightPlugin(hljs, affectedNodes, extractor, setter);
}
