import {
    emphasisRegex,
    boldRegex,
    inlineCodeRegex,
    linkRegex,
    emphasisUnderlineRegex,
    boldUnderlineRegex,
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

    const emphasisUnderlineTests = [
        ["_match_", "_match_", "match"],
        ["_should match_", "_should match_", "should match"],
        ["this _should match_", "_should match_", "should match"],
        ["__no-match_", null, null],
        ["_no\nmatch_", null, null],
        ["__no-match__", null, null],
        ["__not a match_", null, null],
        ["this is __not a match_", null, null],
    ];
    test.each(emphasisUnderlineTests)(
        "emphasis with underlines",
        markInputRuleTest(emphasisUnderlineRegex)
    );

    const boldTests = [
        ["**match**", "**match**", "match"],
        ["**should match**", "**should match**", "should match"],
        ["this **should match**", "**should match**", "should match"],
        ["**no-match*", null, null],
        ["this is **not a match*", null, null],
        ["**no\nmatch**", null, null],
    ];
    test.each(boldTests)("bold", markInputRuleTest(boldRegex));

    const boldUnderlineTests = [
        ["__match__", "__match__", "match"],
        ["__should match__", "__should match__", "should match"],
        ["this __should match__", "__should match__", "should match"],
        ["__no-match_", null, null],
        ["this is __not a match_", null, null],
        ["__no\nmatch__", null, null],
    ];
    test.each(boldUnderlineTests)(
        "bold with underlines",
        markInputRuleTest(boldUnderlineRegex)
    );

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
