import { RichTextEditor, RichTextOptions } from "../../../src/rich-text/editor";
import { externalPluginProvider } from "../../test-helpers";

function richView(
    markdownInput: string,
    opts?: RichTextOptions["highlighting"]
) {
    return new RichTextEditor(
        document.createElement("div"),
        markdownInput,
        externalPluginProvider(),
        {
            highlighting: {
                ...opts,
            },
        }
    );
}

describe("CodeBlockHighlightPlugin", () => {
    it("should highlight code_block code", () => {
        const view = richView("```js\nconsole.log('test');\n```");

        const variable = view.dom.querySelectorAll("span.hljs-variable");
        expect(variable).toHaveLength(1);
        expect(variable[0].textContent).toBe("console");
        const title = view.dom.querySelectorAll("span.hljs-title");
        expect(title).toHaveLength(1);
        expect(title[0].textContent).toBe("log");
        const string = view.dom.querySelectorAll("span.hljs-string");
        expect(string).toHaveLength(1);
        expect(string[0].textContent).toBe("'test'");
        const language = view.dom.querySelectorAll(".js-language-indicator");
        expect(language).toHaveLength(1);
        expect(language[0].textContent).toBe("javascript");
    });

    it("should use override language for highlighting if non provided", () => {
        const view = richView("```\nconsole.log('test');\n```", {
            overrideLanguage: "js",
        });

        //Assert that the code block has been parsed as javascript despite no lanugage given
        const variable = view.dom.querySelectorAll("span.hljs-variable");
        expect(variable).toHaveLength(1);
        expect(variable[0].textContent).toBe("console");
        const title = view.dom.querySelectorAll("span.hljs-title");
        expect(title).toHaveLength(1);
        expect(title[0].textContent).toBe("log");
        const string = view.dom.querySelectorAll("span.hljs-string");
        expect(string).toHaveLength(1);
        expect(string[0].textContent).toBe("'test'");
        //TODO: This is documenting the existing setup; the override should probably be used in both circumstances.
        const language = view.dom.querySelectorAll(".js-language-indicator");
        expect(language).toHaveLength(1);
        expect(language[0].textContent).toBe("plaintext");
    });

    it("should highlight other block types if configured", () => {
        // This test attempts to have paragraphs registered as ripe for highlighting
        // Naturally they don't provide a language, so we're using the override here.
        //  This is to simulate an external block type without needing to define one from scratch
        const view = richView("console.log('test');", {
            overrideLanguage: "js",
            highlightedNodeTypes: ["paragraph"],
        });

        const variable = view.dom.querySelectorAll("p > span.hljs-variable");
        expect(variable).toHaveLength(1);
        expect(variable[0].textContent).toBe("console");
        const title = view.dom.querySelectorAll("p > span.hljs-title");
        expect(title).toHaveLength(1);
        expect(title[0].textContent).toBe("log");
        const string = view.dom.querySelectorAll("p > span.hljs-string");
        expect(string).toHaveLength(1);
        expect(string[0].textContent).toBe("'test'");
    });

    it("should not highlight other block types by default", () => {
        //This is the functional opposite to the above test that registers
        // paragraphs. We provide a language, but don't register the block.
        // It should not highlight.
        const view = richView("console.log('test');", {
            overrideLanguage: "js",
            highlightedNodeTypes: [],
        });

        const paragraph = view.dom.querySelectorAll("p");
        expect(paragraph).toHaveLength(1);
        expect(paragraph[0].textContent).toBe("console.log('test');");
    });
});
