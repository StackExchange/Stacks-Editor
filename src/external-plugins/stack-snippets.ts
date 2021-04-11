import { MarkdownSerializerState } from "prosemirror-markdown";
import { Node } from "prosemirror-model";
import { NodeView } from "prosemirror-view";
import { ExternalEditorPlugin } from "../shared/external-editor-plugin";
import StateBlock from "markdown-it/lib/rules_block/state_block";
import MarkdownIt from "markdown-it/lib";
import Token from "markdown-it/lib/token";
import { escapeHTML } from "../shared/utils";

interface SnippetEditorState {
    language: string | null;
    console: boolean | null;
    hide: boolean | null;
    babel: boolean | null;
}

class StackSnippetsView implements NodeView {
    dom?: HTMLElement | null;
    contentDOM?: HTMLElement | null;
    state: SnippetEditorState;

    constructor(node: Node) {
        this.dom = document.createElement("div");
        this.dom.classList.add("ws-normal", "ow-normal");

        // get the data from the stack snippet tag and parse
        // looks like `js hide: [boolean] console: [boolean] babel: [boolean]`
        const rawDataString = node.attrs.data as string;
        this.state = StackSnippetsView.getSnippetArgs(rawDataString);

        //TODO hack?
        this.dom.innerHTML = escapeHTML`
<div class="s-link-preview" data-language="${this.state.language}"
     data-hide="${this.state.hide.toString()}"
     data-console="${this.state.console.toString()}"
     data-babel="${this.state.babel.toString()}">
    <div class="s-link-preview--header ai-center py4">
        <div class="s-link-preview--title fs-body1 fl1">Code snippet</div>
        <div>
            <button class="s-btn s-btn__muted fc-success s-btn__icon s-btn__xs grid--cell js-not-implemented" title="Run code snippet">
                <span class="icon-bg iconPlay"></span>
            </button>
            <button class="s-btn s-btn__muted s-btn__icon s-btn__xs grid--cell js-not-implemented" title="Expand snippet">
                <span class="icon-bg iconShare"></span>
            </button>
        </div>
    </div>
    <div id="content-dom"></div>
</div>
        `;

        // set the area where prosemirror will insert the node's children
        this.contentDOM = this.dom.querySelector("#content-dom");

        //TODO launch snippet modal
        this.dom.querySelectorAll(".js-not-implemented").forEach((el) => {
            el.addEventListener("click", (e: Event) => {
                e.stopPropagation();
                // eslint-disable-next-line no-alert
                alert("Sorry, this doesn't work yet :)");
            });
        });
    }

    stopEvent(): boolean {
        return true;
    }

    /**
     * Parses out the snippet args from its raw data string
     * @param rawDataString the entire raw snippet data string that looks like `js hide: [boolean] console: [boolean] babel: [boolean]`
     */
    static getSnippetArgs(rawDataString: string): SnippetEditorState {
        const matches = /(.+?) hide: (true|false) console: (true|false) babel: (true|false)/.exec(
            rawDataString
        );

        return {
            language: matches[1] || "js",
            hide: matches[2] === "true",
            console: matches[3] === "true",
            babel: matches[4] === "true",
        };
    }
}

/**
 * Parser rule for stack_snippet and stack_snippet lang, partial based / piecemealed from other markdown-it block rules
 * @param state
 * @param startLine
 * @param endLine
 * @param silent
 */
function stackSnippetsMarkdownPluginImpl(
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
) {
    let pos = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    // Check start
    if (state.src.charCodeAt(pos) !== 0x3c /* < */ || pos + 2 >= max) {
        return false;
    }

    // Quick fail on second char
    const ch = state.src.charCodeAt(pos + 1);
    if (ch !== 0x21 /* ! */) {
        return false;
    }

    // match the first half
    //TODO what are all the different things we can have inside? Does it matter?
    let lineText = state.src.slice(pos, max);
    const matches = /^<!-- begin snippet: (.+?) -->/.exec(lineText);
    if (!matches?.length) {
        return false;
    }

    if (silent) {
        return true;
    }

    const oldLineMax = state.lineMax;
    const oldParentType = state.parentType;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore TODO necessary?
    state.parentType = "stack_snippet";

    let nextLine = startLine + 1;
    const endRegex = /<!-- end snippet -->/;

    let lastNonEmpty = nextLine;

    while (nextLine < endLine) {
        for (; nextLine < endLine; nextLine++) {
            pos = state.bMarks[nextLine] + state.tShift[nextLine];
            max = state.eMarks[nextLine];
            lineText = state.src.slice(pos, max);

            if (lineText.length) {
                lastNonEmpty = nextLine;
            }

            // if this is the end of the snippet, break from the loop
            if (endRegex.test(lineText)) {
                if (lineText.length) {
                    nextLine++;
                }

                break;
            }
        }
        nextLine++;
    }

    state.lineMax = lastNonEmpty;

    let token = state.push("stack_snippet_open", "", 1);
    token.map = [startLine, 0];

    // set the entire snippet data string as an attribute
    token.attrSet("data", matches[1]);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    state.md.block.tokenize(state, startLine + 1, lastNonEmpty);

    token.map[1] = endLine;

    token = state.push("stack_snippet_close", "", -1);
    state.line = endLine + 1;

    state.lineMax = oldLineMax;
    state.parentType = oldParentType;

    return true;
}

/**
 * Parses out `stack_snippet`s
 * @param md
 */
function stackSnippetsMarkdownPlugin(md: MarkdownIt): void {
    md.block.ruler.before(
        "html_block",
        "stack_snippets",
        stackSnippetsMarkdownPluginImpl
    );
}

export const StackSnippetsPlugin: ExternalEditorPlugin = {
    markdownParser: {
        tokens: {
            stack_snippet: {
                block: "stack_snippet",
                getAttrs: (tok: Token): Record<string, unknown> => ({
                    content: tok.content,
                    data: tok.attrGet("data"),
                }),
            },
        },
        plugins: [stackSnippetsMarkdownPlugin],
    },
    markdownSerializers: {
        stack_snippet(state: MarkdownSerializerState, node: Node): void {
            //const args = StackSnippetsView.getSnippetArgs(node.attrs.data);
            //TODO for some reason converting back to rich text breaks when the interior items are fences... commenting out for now
            // state.write(
            //     `<!-- begin snippet: ${args.language} hide:${args.hide} console:${args.console} babel:${args.babel} -->\n\n`
            // );
            state.renderContent(node);
            state.ensureNewLine();
            //state.write("<!-- end snippet -->");
        },
    },
    menuEntries: [],
    nodeViews: {
        stack_snippet(node: Node): NodeView {
            return new StackSnippetsView(node);
        },
    },
    plugins: [],
    schema: {
        nodes: {
            stack_snippet: {
                content: "code_block*",
                attrs: { content: { default: "" }, data: { default: "" } },
                marks: "",
                group: "block",
                inline: false,
                selectable: true,
                isolating: true,
            },
        },
    },
};
