import { deepMerge, validateLink } from "../../src/shared/utils";

describe("utils", () => {
    describe("deepmerge", () => {
        it("should merge two objects", () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const basefn = (input: string): string => "base";
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const overridefn = (x: string): string => "overwritten";
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const new1fn = (input: string): string => "new 1";
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const new2fn = (x: string): string => "new 2";

            const one = {
                s1: "string one",
                n: 1,
                o: { a1: "nested string one", b1: 1 },
                f: basefn,
                f1: new1fn,
                arr: ["item1"],
            };

            const two = {
                s2: "string two",
                n: 2,
                o: { a1: "nested string two", b2: 2 },
                f: overridefn,
                f2: new2fn,
                arr: ["item2"],
            };

            const merged = deepMerge(one, two) as typeof one & typeof two;

            const expected = {
                s1: "string one",
                s2: "string two",
                n: 2,
                o: { a1: "nested string two", b1: 1, b2: 2 },
                f: overridefn,
                f1: new1fn,
                f2: new2fn,
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

            // mailto:
            ["mailto:email@address.com", true],
            ["mailto:email@address", false],
            ["mailto://email@address.com", false],
        ])("should validate a subset of urls (%s)", (input, shouldValidate) => {
            expect(validateLink(input)).toBe(shouldValidate);
        });
    });
});
