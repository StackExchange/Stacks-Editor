import { stackSnippetPlugin } from "../src/stackSnippetPlugin";
import {
    MenuBlock,
    ExternalPluginProvider,
    richTextSchemaSpec,
} from "../../../../src";
import { StackSnippetOptions } from "../src/common";
import { Schema } from "prosemirror-model";

export const snippetExternalProvider = (opts?: StackSnippetOptions) =>
    new ExternalPluginProvider([stackSnippetPlugin(opts)], {});

export const buildSnippetSchema = (provider?: ExternalPluginProvider) =>
    new Schema(
        (provider || snippetExternalProvider()).getFinalizedSchema(
            richTextSchemaSpec
        )
    );

export const buildSnippetMenuEntries = (core: MenuBlock[]) => {
    const provider = snippetExternalProvider({
        renderer: () => Promise.resolve(null),
        openSnippetsModal: () => {},
    });
    return provider.getFinalizedMenu(core, buildSnippetSchema(provider));
};

export const validBegin: string = `<!-- begin snippet: js hide: false console: true babel: null babelPresetReact: false babelPresetTS: false -->

`;

export const configureBegin = (
    hide?: boolean,
    console?: boolean,
    babel?: boolean,
    babelPresetReact?: boolean,
    babelPresetTs?: boolean
): string => {
    const hideStr = hide ? "true" : hide == false ? "false" : "null";
    const consoleStr = console ? "true" : console == false ? "false" : "null";
    const babelStr = babel ? "true" : babel == false ? "false" : "null";
    const babelPresetReactStr = babelPresetReact
        ? "true"
        : babelPresetReact == false
          ? "false"
          : "null";
    const babelPresetTsStr = babelPresetTs
        ? "true"
        : babelPresetTs == false
          ? "false"
          : "null";

    return `<!-- begin snippet: js hide: ${hideStr} console: ${consoleStr} babel: ${babelStr} babelPresetReact: ${babelPresetReactStr} babelPresetTS: ${babelPresetTsStr} -->

`;
};

export const validEnd: string = "<!-- end snippet -->";
export const validJs: string = `<!-- language: lang-js -->

    console.log("test");

`;
export const validCss: string = `<!-- language: lang-css -->

    .test {
      position: fixed;
    }

`;
export const validHtml: string = `<!-- language: lang-html -->

    <div>test</div>

`;
const validHtmlWithSuspiciousComment = (lang: string): string =>
    `<!-- language: lang-html -->

    <!-- language: lang-${lang} -->
    <div>test</div>

`;

//Valid snippets
// - Just JS
// - Just CSS
// - Just HTML
// any two of the three
// all three
// Special cases:
// if the HTML contains comments that look like snippets code
export const validSnippetRenderCases = [
    //All validly rendered Snippet blocks.
    // Positioning of language blocks doesn't matter, but spacing does.
    [validBegin + validJs + validEnd, ["js"]],
    [validBegin + validCss + validEnd, ["css"]],
    [validBegin + validHtml + validEnd, ["html"]],
    [validBegin + validJs + validCss + validEnd, ["js", "css"]],
    [validBegin + validCss + validJs + validEnd, ["js", "css"]],
    [validBegin + validJs + validHtml + validEnd, ["js", "html"]],
    [validBegin + validHtml + validJs + validEnd, ["js", "html"]],
    [validBegin + validCss + validHtml + validEnd, ["css", "html"]],
    [validBegin + validHtml + validCss + validEnd, ["css", "html"]],
    [
        validBegin + validJs + validCss + validHtml + validEnd,
        ["js", "css", "html"],
    ],
    [
        validBegin + validJs + validHtml + validCss + validEnd,
        ["js", "css", "html"],
    ],
    [
        validBegin + validCss + validJs + validHtml + validEnd,
        ["js", "css", "html"],
    ],
    [
        validBegin + validCss + validHtml + validJs + validEnd,
        ["js", "css", "html"],
    ],
    [
        validBegin + validHtml + validCss + validJs + validEnd,
        ["js", "css", "html"],
    ],
    [
        validBegin + validHtml + validJs + validCss + validEnd,
        ["js", "css", "html"],
    ],
    // HTML comments can be used within the HTML body - even if they happen to look like snippet headers
    [validBegin + validHtmlWithSuspiciousComment("html") + validEnd, ["html"]],
    [
        validBegin +
            validHtmlWithSuspiciousComment("css") +
            validCss +
            validEnd,
        ["html", "css"],
    ],
    [
        validBegin + validHtmlWithSuspiciousComment("js") + validJs + validEnd,
        ["html", "js"],
    ],
    [
        validBegin +
            validHtmlWithSuspiciousComment("html") +
            validJs +
            validCss +
            validEnd,
        ["js", "css", "html"],
    ],
];

export const invalidSnippetRenderCases = [
    //No content
    validBegin + validEnd,
    validEnd + validJs + validBegin,
    //No end
    validBegin + validJs,
    //No start
    validJs + validEnd,
    //Missing begin options
    `<!-- begin snippet: js hide: false -->

` +
        validJs +
        validEnd,
    //Unregistered begin options
    `<!-- begin snippet: js hide: false console: true babel: null babelPresetReact: false babelPresetTS: false test: false -->

` +
        validJs +
        validEnd,
];
