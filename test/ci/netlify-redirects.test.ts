import { readFileSync } from "node:fs";
import { join } from "node:path";

const configuration = readFileSync(join(process.cwd(), "netlify.toml"), "utf8");
const redirects = configuration.split("[[redirects]]").slice(1);

describe("Editor documentation redirects", () => {
    it("redirects only the HTTP and HTTPS beta hostnames", () => {
        expect(
            redirects.map((rule) => /^from = "([^"]+)"$/m.exec(rule)?.[1])
        ).toEqual([
            "http://beta.editor.stackoverflow.design/*",
            "https://beta.editor.stackoverflow.design/*",
        ]);
    });

    it("uses forced permanent redirects to the same path on the current host", () => {
        for (const rule of redirects) {
            // With no query override, Netlify passes query parameters through.
            expect(rule).toMatch(
                /^to = "https:\/\/editor\.stackoverflow\.design\/:splat"$/m
            );
            expect(rule).toMatch(/^status = 301$/m);
            expect(rule).toMatch(/^force = true$/m);
        }
    });

    it("leaves build and deploy-context settings in Netlify", () => {
        const sectionHeaders = configuration.match(/^\s*\[.*\]\s*$/gm);

        expect(sectionHeaders?.map((header) => header.trim())).toEqual([
            "[[redirects]]",
            "[[redirects]]",
        ]);
    });
});
