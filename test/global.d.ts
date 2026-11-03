export {};

/*
 * NOTE: Add all exposed matches to `expect.extend` at the bottom
 * and add all the definitions below so TS can pick them up without error
 */

interface CustomMatchers<R = unknown> {
    /**
     * Compares a node dynamically via a deep tree structure, recursing through a document's content via the tree's content
     * @param tree The CompareTree to check against
     */
    toMatchNodeTree(tree: CompareTree): R;
    /**
     * Matches doc against a CSS-like tree of nodes, separated by `>`
     * @param tree a string of nodes, with an optional last number of children
     * ex. "doc>blockquote>paragraph>1"
     * ex. "doc>paragraph"
     * @returns the expect result
     */
    toMatchNodeTreeString(tree: string): R;
}
/**
 * A tree used to compare against a ProsemirrorNode
 * All keys are properties or property chains that will be resolved against the node
 * The resolved property value will be checked against the tree's value for that key
 * `content` contains one compare tree for each child of the ProsemirrorNode and can be arbitrarily deeply nested
 */
export interface CompareTree {
    [propertyChain: string]: unknown;
    content?: CompareTree[];
}

declare global {
    namespace jest {
        interface Expect extends CustomMatchers {}

        interface Matchers<R> extends CustomMatchers<R> {}

        interface InverseAsymmetricMatchers extends CustomMatchers {}
    }
}
