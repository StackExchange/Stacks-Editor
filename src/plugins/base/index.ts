import { history } from "prosemirror-history";
import { Node } from "prosemirror-model";
import { EditorPlugin } from "../../builder/types";
import { richTextInputRules_new } from "../../rich-text/inputrules";
import { CodeBlockView } from "../../rich-text/node-views/code-block";
import { CodeBlockHighlightPlugin } from "../../shared/highlighting/highlight-plugin";
import { readonlyPlugin } from "../../shared/prosemirror-plugins/readonly";
import { generateMarkdownParser } from "./markdownParser";
import { generateBasicMenu } from "./menu";
import { generateBasicSchema } from "./schema";

interface BasePluginOptions {
    /** The method used to validate links; defaults to Stack Overflow's link validation */
    validateLink?: (url: string) => boolean | false;
    codeblockOverrideLanguage?: string;
}

export const basePlugin: EditorPlugin<BasePluginOptions> = {
    optionDefaults: {},
    schema: generateBasicSchema,
    commonmark: () => ({
        plugins: [history(), CodeBlockHighlightPlugin(null), readonlyPlugin()],
    }),
    richText: (options) => ({
        plugins: [
            history(),
            CodeBlockHighlightPlugin(options.codeblockOverrideLanguage),
            readonlyPlugin(),
        ],
        inputRules: richTextInputRules_new({
            validateLink: options.validateLink,
        }),
        nodeViews: {
            code_block(node: Node) {
                return new CodeBlockView(node);
            },
        },
    }),
    markdownParser: () => ({
        tokens: generateMarkdownParser(),
        plugins: [],
    }),
    configureMarkdownIt: (instance) => {
        instance.disable("strikethrough");
    },

    menu: generateBasicMenu,
};
