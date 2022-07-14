import { createBasicNodeTree } from "./matchers";

describe("createBasicNodeTree", () => {
    it("creates nested tree", () => {
        const input = "doc>blockquote>paragraph>1";
        const expected = {
            "type.name": "doc",
            "content": [
                {
                    "type.name": "blockquote",
                    "content": [
                        {
                            "type.name": "paragraph",
                            "childCount": 1,
                        },
                    ],
                },
            ],
        };
        const result = createBasicNodeTree(input);
        expect(result).toEqual(expected);
    });
});
