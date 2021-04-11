import {
    emphasisRegex,
    boldRegex,
    inlineCodeRegex,
    linkRegex,
} from "../../src/rich-text/inputrules";

describe("mark input rules", () => {
    const emphasisTests = [
        ["*match*", "*match*", "match"],
        ["*should match*", "*should match*", "should match"],
        ["this *should match*", "*should match*", "should match"],
        ["**no-match*", null, null],
        ["*no\nmatch*", null, null],
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

    const inlineCodeTests = [
        ["`match`", "`match`", "match"],
        ["`should match`", "`should match`", "should match"],
        ["this `should match`", "`should match`", "should match"],
        ["``match`", "``match`", "`match"],
        ["`no\nmatch`", null, null],
    ];
    test.each(inlineCodeTests)(
        "inline code",
        markInputRuleTest(inlineCodeRegex)
    );

    const linkTests = [
        [
            "[match](https://example.com)",
            "[match](https://example.com)",
            "match",
        ],
        ["[match](something)", "[match](something)", "match"],
        [
            "[this is a match](something)",
            "[this is a match](something)",
            "this is a match",
        ],
        ["[no-match(https://example.com)", null, null],
        ["[no-match)(https://example.com", null, null],
        ["no-match](https://example.com)", null, null],
        ["[no-match]()", null, null],
        ["[no-match]", null, null],
    ];
    test.each(linkTests)("links", markInputRuleTest(linkRegex));

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
