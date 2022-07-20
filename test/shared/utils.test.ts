import {
    bindLetterKeymap,
    deepMerge,
    escapeHTML,
    stackOverflowValidateLink,
    getShortcut,
} from "../../src/shared/utils";

const setNavigatorProperty = (
    property: string,
    value: string,
    configurable = true
): void => {
    Object.defineProperty(navigator, property, {
        value,
        configurable,
    });
};

describe("utils", () => {
    describe("deepmerge", () => {
        it("should merge two objects", () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const baseFn = (input: string): string => "base";
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const overrideFn = (x: string): string => "overwritten";
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const new1Fn = (input: string): string => "new 1";
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const new2Fn = (x: string): string => "new 2";

            const one = {
                s1: "string one",
                n: 1,
                o: { a1: "nested string one", b1: 1 },
                f: baseFn,
                f1: new1Fn,
                arr: ["item1"],
            };

            const two = {
                s2: "string two",
                n: 2,
                o: { a1: "nested string two", b2: 2 },
                f: overrideFn,
                f2: new2Fn,
                arr: ["item2"],
            };

            const merged = deepMerge(one, two) as typeof one & typeof two;

            const expected = {
                s1: "string one",
                s2: "string two",
                n: 2,
                o: { a1: "nested string two", b1: 1, b2: 2 },
                f: overrideFn,
                f1: new1Fn,
                f2: new2Fn,
                arr: ["item1", "item2"],
            };

            expect(merged).toEqual(expected);
        });
    });

    describe("validateLink", () => {
        it.each([
            [null, false],
            [undefined, false],
            ["", false],

            // general urls
            ["no_scheme.com", false],
            ["://inherit_scheme.com", false],
            ["file://invalid_scheme.com", false],
            ["http://", false],
            ["http://a", true],
            //["http://nonascii.みんな/?test=✔", false], // TODO probably a flawed regex, but we want to match the backend...
            ["http://insecure.com", true],
            ["https://secure.com", true],
            ["ftp://file_transfer.com", true],
            [
                "https://sub.complicated.domain:8080/path/to/whatever.png#hash?query=parameter%20test",
                true,
            ],
            ["https://example.org with other text after", false],

            // mailto:
            ["mailto:email@address.com", true],
            ["mailto:email@address", false],
            ["mailto://email@address.com", false],
            ["mailto:email@address.com and then some other text", false],
        ])("should validate a subset of urls (%s)", (input, shouldValidate) => {
            expect(stackOverflowValidateLink(input)).toBe(shouldValidate);
        });
    });

    describe("escapeHTML", () => {
        it("should work on template literals", () => {
            const result = escapeHTML`This is ${"a"} test. ${"Does it work?"}`;
            expect(result).toBe("This is a test. Does it work?");
        });

        it.each([0, false, null, { test: 42 }, "test"])(
            "should work with many substitution types (%#)",
            (sub: unknown) => {
                const result = escapeHTML`${sub}`;
                expect(result).toBe(sub?.toString() || "");
            }
        );

        it("should escape only substitutions", () => {
            const result = escapeHTML`<p>It should escape ${"<span>this</span>"} ${"&"} nothing else</p>`;
            expect(result).toBe(
                "<p>It should escape &lt;span&gt;this&lt;/span&gt; &amp; nothing else</p>"
            );
        });

        // example cases taken from https://owasp.org/www-community/xss-filter-evasion-cheatsheet
        it.each([
            ["", ""],
            [
                "<SCRIPT SRC=http://xss.rocks/xss.js></SCRIPT>",
                "&lt;SCRIPT SRC=http://xss.rocks/xss.js&gt;&lt;/SCRIPT&gt;",
            ],
            [
                `javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/"/+/onmouseover=1/+/[*/[]/+alert(1)//'>`,
                `javascript:/*--&gt;&lt;/title&gt;&lt;/style&gt;&lt;/textarea&gt;&lt;/script&gt;&lt;/xmp&gt;&lt;svg/onload='+/&quot;/+/onmouseover=1/+/[*/[]/+alert(1)//'&gt;`,
            ],
            [
                `<IMG SRC=javascript:alert(&quot;XSS&quot;)>`,
                `&lt;IMG SRC=javascript:alert(&amp;quot;XSS&amp;quot;)&gt;`,
            ],
        ])("should escape html", (input, output) => {
            expect(escapeHTML`${input}`).toBe(output);
        });
    });

    describe("bindLetterKeymap", () => {
        it.each([
            ["Mod-z", true],
            ["Mod-Z", true],
            ["Mod-`", false],
            ["Mod-Backspace", false],
        ])(
            "should double bind lower/upper letter keys",
            (input, shouldDouble) => {
                const result = bindLetterKeymap(input, null);
                const keys = Object.keys(result);
                expect(keys).toHaveLength(shouldDouble ? 2 : 1);
                expect(keys).toContain(input);
                expect(keys[0]).not.toBe(keys[1]);
            }
        );
    });

    describe("getShortcut", () => {
        it("should replace `Mod` with `Cmd` when platform contains `Mac`", () => {
            // Set the platform to macOS
            setNavigatorProperty("platform", "MacIntel");

            const shortcut = getShortcut("Mod-z");
            expect(shortcut).toBe("Cmd-z");
            expect(navigator.platform).toBe("MacIntel");

            // Reset the platform
            setNavigatorProperty("platform", "");
        });
        it("should replace `Mod` with `Ctrl` when platform is not an Apple platform", () => {
            // Set the platform to Windows
            setNavigatorProperty("platform", "Win32");

            const shortcut = getShortcut("Mod-z");
            expect(shortcut).toBe("Ctrl-z");
            expect(navigator.platform).toBe("Win32");

            // Reset the platform
            setNavigatorProperty("platform", "");
        });
        it("should return unmodified string when `Mod` isn't passed", () => {
            const shortcut = getShortcut("Cmd-y");
            expect(shortcut).toBe("Cmd-y" + navigator.platform);
        });
    });
});
