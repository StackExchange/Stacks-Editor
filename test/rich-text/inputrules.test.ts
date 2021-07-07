import { MarkType } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { richTextInputRules } from "../../src/rich-text/inputrules";
import { richTextSchema } from "../../src/shared/schema";
import "../matchers";
import {
    applySelection,
    cleanupPasteSupport,
    createState,
    createView,
    setupPasteSupport,
    sleepAsync,
} from "./test-helpers";

function dispatchInputAsync(view: EditorView, inputStr: string) {
    // insert all but the last character
    const toInsert = inputStr.slice(0, -1);
    view.dispatch(view.state.tr.insertText(toInsert));
    applySelection(view.state, toInsert.length);

    // fire the handleTextInput by appending to the final character dom directly
    if (view.dom.children.length) {
        view.dom.children[0].append(
            document.createTextNode(inputStr.slice(-1))
        );
    }

    // TODO HACK
    // the above is triggered asyncronously via a dom observer,
    // so defer execution so it can finish and update the state
    return sleepAsync(0);
}

function markInputRuleTest(expectedMark: MarkType, charactersTrimmed: number) {
    return async (testString: string, matches: boolean) => {
        const state = createState("", [richTextInputRules]);
        const view = createView(state);

        await dispatchInputAsync(view, testString);

        const matchedText: Record<string, unknown> = {
            "isText": true,
            "text": testString,
            "marks.length": 0,
        };

        if (matches) {
            matchedText.text = testString.slice(
                charactersTrimmed,
                charactersTrimmed * -1
            );
            matchedText["marks.length"] = 1;
            matchedText["marks.0.type.name"] = expectedMark.name;
        }

        expect(view.state.doc).toMatchNodeTree({
            content: [
                {
                    "type.name": "paragraph",
                    "content": [
                        {
                            ...matchedText,
                        },
                    ],
                },
            ],
        });
    };
}

describe("mark input rules", () => {
    // TODO rename?
    // these are necessary due to potential dom interaction
    beforeAll(setupPasteSupport);
    afterAll(cleanupPasteSupport);

    const emphasisTests = [
        ["*match*", true],
        ["*should match*", true],
        ["**no-match*", false],
        ["**not a match*", false],
        ["* no-match*", false],
        ["*no-match *", false],
    ];
    test.each(emphasisTests)(
        "*emphasis* (%#)",
        markInputRuleTest(richTextSchema.marks.em, 1)
    );

    const emphasisUnderlineTests = [
        ["_match_", true],
        ["_should match_", true],
        ["__no-match_", false],
        ["__not a match_", false],
        ["_ no-match_", false],
        ["_no-match _", false],
    ];
    test.each(emphasisUnderlineTests)(
        "_emphasis_ (%#)",
        markInputRuleTest(richTextSchema.marks.em, 1)
    );

    const boldTests = [
        ["**match**", true],
        ["**should match**", true],
        ["** no-match**", false],
        ["**no-match **", false],
    ];
    test.each(boldTests)(
        "**strong** (%#)",
        markInputRuleTest(richTextSchema.marks.strong, 2)
    );

    const boldUnderlineTests = [
        ["__match__", true],
        ["__should match__", true],
        ["__ no-match__", false],
        ["__no-match __", false],
    ];
    test.each(boldUnderlineTests)(
        "__strong__ (%#)",
        markInputRuleTest(richTextSchema.marks.strong, 2)
    );

    const codeTests = [
        ["`match`", true],
        ["`should match`", true],
        ["` no-match`", false],
        ["`no-match `", false],
    ];
    test.each(codeTests)(
        "`code` (%#)",
        markInputRuleTest(richTextSchema.marks.code, 1)
    );

    const linkTests = [
        ["[match](https://example.com)", true],
        ["[ this *is* a __match__ ](https://example.com)", true],
        ["[match](something)", false],
        ["[this is not a match](badurl)", false],
        ["[no-match(https://example.com)", false],
        ["[no-match)(https://example.com", false],
        ["no-match](https://example.com)", false],
        ["[no-match]()", false],
        ["[no-match]", false],
    ];
    test.each(linkTests)(
        "links (%#)",
        async (testString: string, matches: boolean) => {
            const state = createState("", [richTextInputRules]);
            const view = createView(state);

            await dispatchInputAsync(view, testString);

            const matchedText: Record<string, unknown> = {
                "isText": true,
                "text": testString,
                "marks.length": 0,
            };

            if (matches) {
                matchedText.text = /\[(.+?)\]/.exec(testString)[1];
                matchedText["marks.length"] = 1;
                matchedText["marks.0.type.name"] =
                    richTextSchema.marks.link.name;
                matchedText["marks.0.attrs.href"] = /\((.+?)\)/.exec(
                    testString
                )[1];
            }

            expect(view.state.doc).toMatchNodeTree({
                content: [
                    {
                        "type.name": "paragraph",
                        "content": [
                            {
                                ...matchedText,
                            },
                        ],
                    },
                ],
            });
        }
    );
});
