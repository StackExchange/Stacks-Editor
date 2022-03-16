import MarkdownIt from "markdown-it/lib";
import type Token from "markdown-it/lib/token";
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

// many test cases taken from commonmark speck
// see https://spec.commonmark.org/0.30/#reference-link
describe("reference-link markdown-it plugin", () => {
    const instance = new MarkdownIt("default", { linkify: true });
    instance.use(reference_link);

    const simpleReferenceLinkData = [
        // full
        [`[foo][bar]\n\n[bar]: /url "title"`, "bar"],
        [`[foo][BaR]\n\n[bar]: /url "title"`, "BaR"],
        // collapsed
        [`[foo][]\n\n[foo]: /url "title"`, "foo"],
        // shortcut
        [`[foo]\n\n[foo]: /url "title"`, "foo"],
    ];
    it.each(simpleReferenceLinkData)(
        "should detect simple reference links (#%#)",
        (markdown, label) => {
            const tokens = instance.parse(markdown, {});

            const links = findTokensOfType(tokens, "link_open");

            // Note: this relies on the fact we're only adding a single link to our input cases
            expect(links).toHaveLength(1);

            const meta = links[0].meta as { reference: { label: string } };
            expect(meta.reference.label).toEqual(label);
        }
    );

    // TODO merge with above test?
    const complexReferenceLinkData = [
        ["[link *foo **bar** `#`*][ref]\n\n[ref]: /uri", "ref"],
        ["[![moon](moon.jpg)][ref]\n\n[ref]: /uri", "ref"],
        ["[foo]\n[bar]\n\n[foo]: /url1\n[bar]: /url2", ["foo", "bar"]],
    ];
    it.each(complexReferenceLinkData)(
        "should detect complex reference links (#%#)",
        (markdown: string, labels: string | string[]) => {
            if (!(labels instanceof Array)) {
                labels = [labels];
            }

            const tokens = instance.parse(markdown, {});

            const links = findTokensOfType(tokens, "link_open");

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
