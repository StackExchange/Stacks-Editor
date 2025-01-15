import MarkdownIt, { Token } from "markdown-it";
import { reference_link } from "../../../src/shared/markdown-it/reference-link";

function findTokensOfType(tokens: Token[], type: string): Token[] {
    const retTokens: Token[] = [];

    tokens.forEach((t) => {
        if (t.type === type) {
            retTokens.push(t);
        }

        if (t.children) {
            retTokens.push(...findTokensOfType(t.children, type));
        }
    });

    return retTokens;
}

function withImageCases(input: [string, string | string[], string?][]): {
    markdown: string;
    labels: string[];
    type: string;
}[] {
    return [
        ...input.map(([markdown, label, type]) => ({
            markdown,
            labels: label instanceof Array ? label : [label],
            type: type || "link_open",
        })),
        ...input
            .map(([markdown, label, type]) =>
                type
                    ? null
                    : {
                          markdown: "!" + markdown,
                          labels: label instanceof Array ? label : [label],
                          type: "image",
                      }
            )
            .filter((i) => !!i),
    ];
}

// many test cases taken from commonmark speck
// see https://spec.commonmark.org/0.30/#reference-link
describe("reference-link markdown-it plugin", () => {
    const instance = new MarkdownIt("default", { linkify: true });
    instance.use(reference_link);

    const referenceLinkData = withImageCases([
        // full
        [`[foo][bar]\n\n[bar]: /url "title"`, "bar"],
        [`[foo][BaR]\n\n[bar]: /url "title"`, "BaR"],
        // collapsed
        [`[foo][]\n\n[foo]: /url "title"`, "foo"],
        // shortcut
        [`[foo]\n\n[foo]: /url "title"`, "foo"],
        // complex
        ["[link *foo **bar** `#`*][ref]\n\n[ref]: /uri", "ref"],
        // link tests
        [
            "[foo]\n[bar]\n\n[foo]: /url1\n[bar]: /url2",
            ["foo", "bar"],
            "link_open",
        ],
        ["[![moon](moon.jpg)][ref]\n\n[ref]: /uri", "ref", "link_open"],
        // image tests
        [
            "![foo]\n![bar]\n\n[foo]: /url1\n[bar]: /url2",
            ["foo", "bar"],
            "image",
        ],
    ]);
    it.each(referenceLinkData)(
        "should detect reference links (#%#)",
        ({ markdown, labels, type }) => {
            const tokens = instance.parse(markdown, {});

            const links = findTokensOfType(tokens, type);

            // Note: this relies on the fact we're only adding a single link to our input cases
            expect(links).toHaveLength(labels.length);

            links.forEach((link, i) => {
                const meta = link.meta as { reference: { label: string } };
                expect(meta.reference.label).toEqual(labels[i]);
            });
        }
    );

    const notReferenceLinkData = [
        // TODO commented tests are failures
        //`[foo [bar](/uri)][ref]\n\n[ref]: /uri`
        `[link](/uri "title")`,
        `<https://www.example.com>`,
        `https://www.example.com`,
    ];
    it.each(notReferenceLinkData)(
        "should not detect incorrect reference links (#%#)",
        (markdown) => {
            const tokens = instance.parse(markdown, {});

            const links = findTokensOfType(tokens, "link_open");
            expect(links.length).toBeGreaterThan(0);

            const referenceLinks = links.filter(
                (t) => (t.meta as { reference: unknown })?.reference
            );
            expect(referenceLinks).toHaveLength(0);
        }
    );
});
