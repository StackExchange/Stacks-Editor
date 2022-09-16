import MarkdownIt from "markdown-it";
import Token from "markdown-it/lib/token";
import { hardbreak_markup } from "../../../src/shared/markdown-it/hardbreak-markup";

describe("hardbreak-markup", () => {
    const instance = new MarkdownIt("default").use(hardbreak_markup);
    const hardbreak = (rendered: Token[]) =>
        rendered
            .find((t) => t.type === "inline")
            .children.find((t) => t.type === "hardbreak");

    it("should detect backslash hardbreaks", () => {
        // NOTE: String.raw used here because we want that backslash as a literal character
        const markdown = String.raw`test\
test`;
        const rendered = instance.parse(markdown, {});
        expect(hardbreak(rendered).markup).toBe("\\\n");
    });

    it("should detect double space hardbreaks", () => {
        const markdown = `test  \ntest`;
        const rendered = instance.parse(markdown, {});
        expect(hardbreak(rendered).markup).toBe("  \n");
    });
});
