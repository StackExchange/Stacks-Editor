import {
    deepMerge,
    escapeHTML,
    stackOverflowValidateLink,
    getShortcut,
    getPlatformModKey,
    setAttributesOnElement,
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
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
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

    describe("getPlatformModKey", () => {
        it("should return `Cmd` when platform contains `Mac` and `Ctrl` otherwise", () => {
            // Set the platform to macOS
            setNavigatorProperty("platform", "MacIntel");

            let mod = getPlatformModKey();
            expect(mod).toBe("Cmd");
            expect(navigator.platform).toBe("MacIntel");

            // Set the platform to Windows
            setNavigatorProperty("platform", "Win32");
            mod = getPlatformModKey();
            expect(mod).toBe("Ctrl");
            expect(navigator.platform).toBe("Win32");

            // Reset the platform
            setNavigatorProperty("platform", "");
        });
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

    describe("setAttributesOnElement", () => {
        it("should set valid attributes on an element", () => {
            const el = document.createElement("div");
            setAttributesOnElement(el, {
                id: "string-value",
                dataFooBar: "camelCaseKey",
                dataNumber: 42,
                dataBoolean: true,
                dataComplex: [{}],
            });

            expect(el.hasAttribute("id")).toBe(true);
            expect(el.getAttribute("id")).toBe("string-value");
            expect(el.hasAttribute("data-foo-bar")).toBe(true);
            expect(el.getAttribute("data-foo-bar")).toBe("camelCaseKey");
            expect(el.hasAttribute("data-number")).toBe(true);
            expect(el.getAttribute("data-number")).toBe("42");
            expect(el.hasAttribute("data-boolean")).toBe(true);
            expect(el.getAttribute("data-boolean")).toBe("");
            expect(el.hasAttribute("data-complex")).toBe(true);
            expect(el.getAttribute("data-complex")).toBe("[object Object]");
        });

        it("should set valid falsy valued attributes on an element", () => {
            const el = document.createElement("div");
            setAttributesOnElement(el, {
                dataString: "",
                dataNumber: 0,
                dataNull: null,
                dataUndefined: undefined,
            });

            expect(el.hasAttribute("data-string")).toBe(true);
            expect(el.getAttribute("data-string")).toBe("");

            expect(el.hasAttribute("data-number")).toBe(true);
            expect(el.getAttribute("data-number")).toBe("0");

            expect(el.hasAttribute("data-null")).toBe(true);
            expect(el.getAttribute("data-null")).toBe("null");

            expect(el.hasAttribute("data-undefined")).toBe(true);
            expect(el.getAttribute("data-undefined")).toBe("undefined");
        });

        it("should not set invalid attributes on an element", () => {
            const el = document.createElement("div");
            setAttributesOnElement(el, {
                style: "background: red;",
                class: "foo",
                className: "bar",
                onClick: (): void => void 0,
            });

            expect(el.hasAttribute("style")).toBe(false);
            expect(el.hasAttribute("class")).toBe(false);
            expect(el.hasAttribute("className")).toBe(false);
            expect(el.hasAttribute("onClick")).toBe(false);
        });
    });
});
