import { Plugin, NodeSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node as ProsemirrorNode, Schema, Slice } from "prosemirror-model";
import { log } from "../../../../src/shared/logger";
import {
    BeginMetaLine,
    EndMetaLine,
    LangMetaLine,
    mapMetaLine,
    validSnippetRegex,
} from "./common";
import { generateRandomId } from "../../../../src/shared/utils";
import { insertParagraphIfAtDocEnd } from "../../../../src/rich-text/commands/helpers";

export const parseSnippetBlockForProsemirror = (
    schema: Schema,
    content: string
): ProsemirrorNode | null => {
    if (
        !("stack_snippet" in schema.nodes) ||
        !("stack_snippet_lang" in schema.nodes)
    ) {
        return null;
    }

    const snippetType = schema.nodes.stack_snippet;
    const snippetLang = schema.nodes.stack_snippet_lang;

    //Trim, then split out the contents
    const rawLines = content.trim().split(/\r\n|\n|\r/);

    //Grab the first line and check it for our opening snippet marker
    if (rawLines.length > 0 && !validSnippetRegex.test(rawLines[0])) {
        return null;
    }

    //Now we're going to process each line as it comes, arranging the contents into blocks and creating nodes as we go
    let beginBlock: BeginMetaLine | null = null;
    let endBlock: EndMetaLine | null = null;
    let currentLangBlock: LangMetaLine;
    let contentLines: string[] = [];
    let langNodes: ProsemirrorNode[] = [];
    for (let i = 0; i < rawLines.length; i++) {
        //Preserve our whitespace
        if (rawLines[i].length === 0 && currentLangBlock) {
            contentLines = [...contentLines, rawLines[i]];
            continue;
        }
        //Dip test, then regex test: Is this a meta line?
        if (
            rawLines[i].charCodeAt(0) != 60 ||
            !validSnippetRegex.test(rawLines[i])
        ) {
            //This is content.
            contentLines = [...contentLines, rawLines[i]];
            continue;
        }
        const metaLine = mapMetaLine({ line: rawLines[i], index: i });
        if (!metaLine) {
            log(
                "parseSnippetBlockForProsemirror",
                "We've found something weird in the middle of a snippet. Can't parse."
            );
            return null;
        }

        if (metaLine.type == "begin") {
            beginBlock = metaLine;
            continue;
        }

        //A new lang meta or end meta represents the end of the existing lang block. If one is open, finish up.
        if (currentLangBlock) {
            if (contentLines.length === 0) {
                log(
                    "parseSnippetBlockForProsemirror",
                    "We've got an open lang block with nothing in it. Can't parse."
                );
                return null;
            }
            try {
                //We want to parse out the raw contents, which means:
                // - No start/end spacing (hence: trim)
                // - Remove the 4-space padding at the start of a string (if present)
                // - Leave any additional spacing alone (indentation on code, for example)
                const code = contentLines
                    .map((l) => (l.startsWith("    ") ? l.slice(4) : l))
                    .join("\n")
                    .trim();
                const langNode = snippetLang.createChecked(
                    { language: currentLangBlock.language },
                    schema.text(code)
                );
                langNodes = [...langNodes, langNode];
            } catch (e) {
                //Could not create a langnode from the content. Highly messed up!
                log("parseSnippetBlockForProsemirror", e);
                return null;
            }
        }

        if (metaLine.type == "lang") {
            currentLangBlock = metaLine;
            contentLines = [];
            continue;
        }

        endBlock = metaLine;
    }

    //Once we're done processing, a final check: do we have everything we need for a valid snippet?
    if (!beginBlock || !endBlock || langNodes.length == 0) {
        log(
            "parseSnippetBlockForProsemirror",
            "We're missing either a beginning, end or at least one lang node. Can't parse."
        );
        return null;
    }

    try {
        //This is another entry point for snippets into RT mode, so we need to generate a random ID here.
        return snippetType.createChecked(
            {
                id: generateRandomId(),
                babel: beginBlock.babel,
                babelPresetReact: beginBlock.babelPresetReact,
                babelPresetTS: beginBlock.babelPresetTS,
                console: beginBlock.console,
                hide: beginBlock.hide,
            },
            langNodes
        );
    } catch (e) {
        //Could not create a snippet node from the langnodes.
        log("parseSnippetBlockForProsemirror", e);
        return null;
    }
};

/** Plugin for the rich-text editor that auto-detects if code was pasted and handles it specifically */
export const stackSnippetPasteHandler = new Plugin({
    props: {
        handlePaste(view: EditorView, event: ClipboardEvent, slice: Slice) {
            const initialPosition = view.state.tr.selection.to;
            // if we're pasting into an existing code block, don't bother checking for code
            // We're talking _about_ snippets, not rendering them
            const schema = view.state.schema;
            const codeblockType = schema.nodes.code_block;
            const currNodeType = view.state.selection.$from.node().type;
            if (currNodeType === codeblockType) {
                return false;
            }

            //Otherwise, we're fit to parse the content as a node, and replace the selection down to the doc root
            let stackSnippet;
            if (
                slice &&
                slice.content.childCount === 1 &&
                slice.content.child(0).type.name === "stack_snippet"
            ) {
                stackSnippet = slice.content.child(0).textContent;
            } else {
                stackSnippet = event.clipboardData.getData("text/plain");
            }
            const snippetNode = parseSnippetBlockForProsemirror(
                view.state.schema,
                stackSnippet
            );

            //For some reason, the node was not parsed as a snippet, so we're not handling it.
            if (!snippetNode) {
                return false;
            }

            let tr = view.state.tr.replaceSelectionWith(snippetNode);
            tr = insertParagraphIfAtDocEnd(tr);
            view.dispatch(tr);
            view.dispatch(
                view.state.tr
                    .setSelection(
                        NodeSelection.near(
                            tr.doc.resolve(
                                snippetNode.nodeSize + initialPosition
                            )
                        )
                    )
                    .scrollIntoView()
            );
            return true;
        },
    },
});
