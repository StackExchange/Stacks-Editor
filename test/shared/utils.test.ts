import { deepMerge } from "../../src/shared/utils";

describe("utils", () => {
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
