import { MarkType, Node as PMNode } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { schema as basicSchema } from "prosemirror-schema-basic";
import {
    ExtendedInputRule,
    richTextInputRules,
    textblockTypeTrailingParagraphInputRule,
} from "../../src/rich-text/inputrules";
import { stackOverflowValidateLink } from "../../src/shared/utils";
import {
    applySelection,
    cleanupPasteSupport,
    createState,
    createView,
    setupPasteSupport,
    sleepAsync,
    testRichTextSchema,
} from "./test-helpers";
import { EditorState } from "prosemirror-state";

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
    // the above is triggered asynchronously via a dom observer,
    // so defer execution so it can finish and update the state
    return sleepAsync(0);
}

function markInputRuleTest(expectedMark: MarkType, charactersTrimmed: number) {
    return async (testString: string, matches: boolean) => {
        const state = createState("", [
            richTextInputRules(testRichTextSchema, {
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
        markInputRuleTest(testRichTextSchema.marks.em, 1)
    );

    const emphasisUnderlineTests = [
        ["_match_", true],
        ["_should match_", true],
        ["__no-match_", false],
        ["__not a match_", false],
        ["_ no-match_", false],
        ["_no-match _", false],
        ["text_no-match_", false],
    ];
    // eslint-disable-next-line jest/expect-expect
    it.each(emphasisUnderlineTests)(
        "_emphasis_ (%s)",
        markInputRuleTest(testRichTextSchema.marks.em, 1)
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
        markInputRuleTest(testRichTextSchema.marks.strong, 2)
    );

    const boldUnderlineTests = [
        ["__match__", true],
        ["__should match__", true],
        ["__ no-match__", false],
        ["__no-match __", false],
        ["text__no-match__", false],
    ];
    // eslint-disable-next-line jest/expect-expect
    it.each(boldUnderlineTests)(
        "__strong__ (%s)",
        markInputRuleTest(testRichTextSchema.marks.strong, 2)
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
        markInputRuleTest(testRichTextSchema.marks.code, 1)
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
                richTextInputRules(testRichTextSchema, {
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
                    testRichTextSchema.marks.link.name;
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

describe("textblockTypeTrailingParagraphInputRule", () => {
    it("inserts trailing paragraph when node is at the document end", () => {
        // Create a doc with a single paragraph that contains only the trigger text "```".
        const paragraph = basicSchema.nodes.paragraph.create(
            null,
            basicSchema.text("```")
        );
        const doc = basicSchema.nodes.doc.create(null, paragraph);
        const state = EditorState.create({ doc, schema: basicSchema });

        // Create the input rule that transforms the trigger text into a code_block and,
        // if needed, appends an empty paragraph.
        const rule = textblockTypeTrailingParagraphInputRule(
            /^```$/,
            basicSchema.nodes.code_block
        ) as ExtendedInputRule;

        // Simulate a match for the trigger text "```".
        // In a paragraph, text typically starts at position 1. For a 3-character string, we use positions 1 to 4.
        const match = /^```$/.exec("```")!;
        const tr = rule.handler(state, match, 1, 4);
        if (!tr) {
            throw new Error("Expected a valid transaction");
        }
        const newDoc: PMNode = tr.doc;

        // We expect the resulting doc to have two children:
        //  - The first is the code_block that replaced the original trigger text.
        //  - The second is the extra empty paragraph inserted at the end.
        expect(newDoc.childCount).toBe(2);
        expect(newDoc.child(0).type.name).toBe("code_block");
        expect(newDoc.child(1).type.name).toBe("paragraph");
        expect(newDoc.child(1).textContent).toBe("");
    });

    it("does not insert trailing paragraph when node is not at document end", () => {
        // Create a doc with two paragraphs:
        //  - The first contains the trigger text "```".
        //  - The second contains additional text.
        const paragraph1 = basicSchema.nodes.paragraph.create(
            null,
            basicSchema.text("```")
        );
        const paragraph2 = basicSchema.nodes.paragraph.create(
            null,
            basicSchema.text("Hello")
        );
        const doc = basicSchema.nodes.doc.create(null, [
            paragraph1,
            paragraph2,
        ]);
        const state = EditorState.create({ doc, schema: basicSchema });

        const rule = textblockTypeTrailingParagraphInputRule(
            /^```$/,
            basicSchema.nodes.code_block
        ) as ExtendedInputRule;
        const match = /^```$/.exec("```")!;
        const tr = rule.handler(state, match, 1, 4);
        if (!tr) {
            throw new Error("Expected a valid transaction");
        }
        const newDoc: PMNode = tr.doc;

        // Since there's additional content after the transformed node,
        // no extra paragraph should be appended.
        // The document should have:
        //  - The first child: the code_block replacing the trigger text.
        //  - The second child: the unchanged paragraph with text "Hello".
        expect(newDoc.childCount).toBe(2);
        expect(newDoc.child(0).type.name).toBe("code_block");
        expect(newDoc.child(1).type.name).toBe("paragraph");
        expect(newDoc.child(1).textContent).toBe("Hello");
    });
});
