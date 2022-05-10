import { MarkType } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { richTextInputRules } from "../../src/rich-text/inputrules";
import { richTextSchema } from "../../src/rich-text/schema";
import { stackOverflowValidateLink } from "../../src/shared/utils";
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
        const state = createState("", [
            richTextInputRules({
                validateLink: stackOverflowValidateLink,
            }),
        ]);
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
    // eslint-disable-next-line jest/expect-expect
    it.each(emphasisTests)(
        "*emphasis* (%s)",
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
    // eslint-disable-next-line jest/expect-expect
    it.each(emphasisUnderlineTests)(
        "_emphasis_ (%s)",
        markInputRuleTest(richTextSchema.marks.em, 1)
    );

    const boldTests = [
        ["**match**", true],
        ["**should match**", true],
        ["** no-match**", false],
        ["**no-match **", false],
    ];
    // eslint-disable-next-line jest/expect-expect
    it.each(boldTests)(
        "**strong** (%s)",
        markInputRuleTest(richTextSchema.marks.strong, 2)
    );

    const boldUnderlineTests = [
        ["__match__", true],
        ["__should match__", true],
        ["__ no-match__", false],
        ["__no-match __", false],
    ];
    // eslint-disable-next-line jest/expect-expect
    it.each(boldUnderlineTests)(
        "__strong__ (%s)",
        markInputRuleTest(richTextSchema.marks.strong, 2)
    );

    const codeTests = [
        ["`match`", true],
        ["`should match`", true],
        ["` no-match`", false],
        ["`no-match `", false],
    ];
    // eslint-disable-next-line jest/expect-expect
    it.each(codeTests)(
        "`code` (%s)",
        markInputRuleTest(richTextSchema.marks.code, 1)
    );

    const customValidateLink = (link: string) => /www.example.com/.test(link);

    const linkTests = [
        ["[match](https://example.com)", true, null],
        ["[ this *is* a __match__ ](https://example.com)", true, null],
        ["[match](something)", false, null],
        ["[this is not a match](badurl)", false, null],
        ["[no-match(https://example.com)", false, null],
        ["[no-match)(https://example.com", false, null],
        ["no-match](https://example.com)", false, null],
        ["[no-match]()", false, null],
        ["[no-match]", false, null],
        ["[custom pass](www.example.com)", true, customValidateLink],
        ["[custom fail](www.notexample.com)", false, customValidateLink],
    ];
    it.each(linkTests)(
        "links (%s)",
        async (
            testString: string,
            matches: boolean,
            validateLink: typeof stackOverflowValidateLink
        ) => {
            const state = createState("", [
                richTextInputRules({
                    validateLink: validateLink ?? stackOverflowValidateLink,
                }),
            ]);
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
