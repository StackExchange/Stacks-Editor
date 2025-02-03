import { preserve_escape } from "../../../src/shared/markdown-it/preserve-escape";
import MarkdownIt, {Token} from "markdown-it";

describe('preserve-escape', () => {
    const preserved = new MarkdownIt("default").use(preserve_escape);

    const renderedInline = (rendered: Token[]) =>
        rendered.find((t) => t.type === "inline");

    const renderedText = (rendered: Token[]) =>
        renderedInline(rendered)
            .children.find((t) => t.type === "text");

    const renderedEscape = (rendered: Token[]) =>
        renderedInline(rendered)
            .children.find((t) => t.type === 'escape');

    it("should render input exactly if nothing to escape", () => {
        const markdown = `test`;

        const rendered = preserved.parse(markdown, {});
        expect(renderedText(rendered).content).toBe(markdown);
    })

    it("should render input exactly if the escape rule is disabled", () => {
        const disabled = new MarkdownIt("default")
            .disable("escape")
            .use(preserve_escape);
        const markdown = String.raw`\# this is just some text`;
        const rendered = disabled.parse(markdown, {})
        expect(renderedText(rendered).content).toBe(markdown);
    })

    it("should preserve escaped characters", () => {
        const markdown = String.raw`\# this is just some text`;

        //First, validate that rendering the escaped string removes the escape
        const base = new MarkdownIt("default");
        const comparison = base.parse(markdown, {});
        expect(renderedText(comparison).content).toBe('# this is just some text');

        //Next, we want to prove we've got an extra node that has the preserved, escaped character
        const rendered = preserved.parse(markdown, {});
        const escapeNode = renderedEscape(rendered);
        expect(escapeNode.type).toBe("escape")
        expect(escapeNode.content).toBe("#")
        expect(escapeNode.markup).toBe(String.raw`\#`)

        //Lastly, that the rest of the string is its own text node
        expect(renderedText(rendered).content).toBe(" this is just some text");
    });
});
