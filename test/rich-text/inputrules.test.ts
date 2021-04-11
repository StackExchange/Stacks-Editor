import { emphasisRegex } from "../../src/rich-text/inputrules";

describe("mark input rules", () => {
    const emphasisTests = [
        ["*match*", "*match*", "match"],
        ["*should match*", "*should match*", "should match"],
        ["this *should match*", "*should match*", "should match"],
        ["**no-match*", null, null],
        ["**no-match**", null, null],
        ["**not a match*", null, null],
        ["this is **not a match*", null, null],
    ];
    test.each(emphasisTests)(
        "emphasis",
        (
            testString: string,
            expectedMatch: string | null,
            expectedMatchToBeReplaced: string | null
        ) => {
            // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
            const matches = testString.match(emphasisRegex);

            if (!expectedMatch || !expectedMatchToBeReplaced) {
                expect(matches).toBeNull();
            } else {
                expect(matches[0]).toEqual(expectedMatch);
                expect(matches[1]).toEqual(expectedMatchToBeReplaced);
            }
        }
    );
});
