import { MarkType } from "prosemirror-model";
import { richTextInputRules } from "../../src/rich-text/inputrules";
import { richTextSchema } from "../../src/shared/schema";
import "../matchers";
import {
    applySelection,
    createState,
    createView,
    sleepAsync,
} from "./test-helpers";

describe("mark input rules", () => {
    const emphasisTests = [
        ["*match*", "*match*", "match"],
        ["*should match*", "*should match*", "should match"],
        //["this *should match*", "*should match*", "should match"],
        // ["**no-match*", null, null],
        // ["*no\nmatch*", null, null],
        // ["**no-match**", null, null],
        // ["**not a match*", null, null],
        // ["this is **not a match*", null, null],
    ];
    test.each(emphasisTests)(
        "emphasis",
        markInputRuleTest(richTextSchema.marks.em, 1)
    );

    // const emphasisUnderlineTests = [
    //     ["_match_", "_match_", "match"],
    //     ["_should match_", "_should match_", "should match"],
    //     ["this _should match_", "_should match_", "should match"],
    //     ["__no-match_", null, null],
    //     ["_no\nmatch_", null, null],
    //     ["__no-match__", null, null],
    //     ["__not a match_", null, null],
    //     ["this is __not a match_", null, null],
    // ];
    // test.each(emphasisUnderlineTests)(
    //     "emphasis with underlines",
    //     markInputRuleTest(emphasisUnderlineRegex)
    // );

    // const boldTests = [
    //     ["**match**", "**match**", "match"],
    //     ["**should match**", "**should match**", "should match"],
    //     ["this **should match**", "**should match**", "should match"],
    //     ["**no-match*", null, null],
    //     ["this is **not a match*", null, null],
    //     ["**no\nmatch**", null, null],
    // ];
    // test.each(boldTests)("bold", markInputRuleTest(boldRegex));

    // const boldUnderlineTests = [
    //     ["__match__", "__match__", "match"],
    //     ["__should match__", "__should match__", "should match"],
    //     ["this __should match__", "__should match__", "should match"],
    //     ["__no-match_", null, null],
    //     ["this is __not a match_", null, null],
    //     ["__no\nmatch__", null, null],
    // ];
    // test.each(boldUnderlineTests)(
    //     "bold with underlines",
    //     markInputRuleTest(boldUnderlineRegex)
    // );

    // const inlineCodeTests = [
    //     ["`match`", "`match`", "match"],
    //     ["`should match`", "`should match`", "should match"],
    //     ["this `should match`", "`should match`", "should match"],
    //     ["``match`", "``match`", "`match"],
    //     ["`no\nmatch`", null, null],
    // ];
    // test.each(inlineCodeTests)(
    //     "inline code",
    //     markInputRuleTest(inlineCodeRegex)
    // );

    // const linkTests = [
    //     [
    //         "[match](https://example.com)",
    //         "[match](https://example.com)",
    //         "match",
    //     ],
    //     ["[match](something)", "[match](something)", "match"],
    //     [
    //         "[this is a match](something)",
    //         "[this is a match](something)",
    //         "this is a match",
    //     ],
    //     ["[no-match(https://example.com)", null, null],
    //     ["[no-match)(https://example.com", null, null],
    //     ["no-match](https://example.com)", null, null],
    //     ["[no-match]()", null, null],
    //     ["[no-match]", null, null],
    // ];
    // test.each(linkTests)("links", markInputRuleTest(linkRegex));

    function markInputRuleTest(
        expectedMark: MarkType,
        charactersTrimmed: number
    ) {
        return async (testString: string) => {
            const state = createState("", [richTextInputRules]);
            const view = createView(state);

            // insert all but the last character
            const toInsert = testString.slice(0, -1);
            view.dispatch(view.state.tr.insertText(toInsert));
            applySelection(view.state, toInsert.length);

            // fire the handleTextInput by appending to the final character dom directly
            if (view.dom.children.length) {
                view.dom.children[0].append(
                    document.createTextNode(testString.slice(-1))
                );
            }

            // TODO HACK
            // the above is triggered asyncronously via a dom observer,
            // so defer execution so it can finish and update the state
            await sleepAsync(0);

            expect(view.state.doc).toMatchNodeTree({
                content: [
                    {
                        "type.name": "paragraph",
                        "content": [
                            {
                                "isText": true,
                                "text": testString.slice(
                                    charactersTrimmed,
                                    charactersTrimmed * -1
                                ),
                                "marks.length": 1,
                                "marks.0.type.name": expectedMark.name,
                            },
                        ],
                    },
                ],
            });
        };
    }
});
