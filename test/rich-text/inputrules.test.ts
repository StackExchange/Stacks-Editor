import { emphasisRegex, boldRegex } from "../../src/rich-text/inputrules";

describe("mark input rules", () => {
    const emphasisTests = [
        ["*match*", "*match*", "match"],
        ["*should match*", "*should match*", "should match"],
        ["this *should match*", "*should match*", "should match"],
        ["**no-match*", null, null],
        // ["*no\nmatch*", null, null],
        ["**no-match**", null, null],
        ["**not a match*", null, null],
        ["this is **not a match*", null, null],
    ];
    test.each(emphasisTests)("emphasis", markInputRuleTest(emphasisRegex));

    const boldTests = [
        ["**match**", "**match**", "match"],
        ["**should match**", "**should match**", "should match"],
        ["this **should match**", "**should match**", "should match"],
        ["**no-match*", null, null],
        ["this is **not a match*", null, null],
        ["**no\nmatch**", null, null],
    ];
    test.each(boldTests)("bold", markInputRuleTest(boldRegex));

    function markInputRuleTest(regex: RegExp) {
        return (
            testString: string,
            expectedWholeMatch: string | null,
            expectedMatchToBeReplaced: string | null
        ) => {
            // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
            const matches = testString.match(regex);

            if (!expectedWholeMatch || !expectedMatchToBeReplaced) {
                expect(matches).toBeNull();
            } else {
                expect(matches[0]).toEqual(expectedWholeMatch);
                expect(matches[1]).toEqual(expectedMatchToBeReplaced);
            }
        };
    }
});
