import { Node as ProsemirrorNode } from "prosemirror-model";

/*
 * NOTE: Add all exposed matches to `expect.extend` at the bottom
 * and add all the definitions below so TS can pick them up without error
 */
/* eslint-disable @typescript-eslint/no-empty-interface */
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

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface Expect extends CustomMatchers {}
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface Matchers<R> extends CustomMatchers<R> {}
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface InverseAsymmetricMatchers extends CustomMatchers {}
    }
}

/**
 * Reflects into an object to get a property by name
 * @param obj The object to reflect into
 * @param propName The property to get the value of
 */
function prop<T>(obj: T, propName: string) {
    // for type safety, we create a new "type" that is actually all the keys of obj
    type keyOfType = keyof T;
    // if the current property name doesn't exist on the object, then the cast will fail
    const prop = propName as keyOfType;
    return prop ? obj[prop] : undefined;
}

/**
 * Deeply reflects into an object to get its properties by name
 * @param obj The object to reflect into
 * @param propChain The chain of properties to deeply fetch into; eg "marks.0.type.name"
 */
function deepProp<T>(obj: T, propChain: string) {
    const props = propChain.split(".");
    return props.reduce((p: unknown, n: string) => {
        if (typeof p === "undefined") {
            throw (
                "Unable to reflect into undefined object; propChain: " +
                propChain +
                "; last prop: " +
                n +
                "; full object: " +
                JSON.stringify(obj)
            );
        }

        return prop(p, n);
    }, obj);
}

/**
 * A tree used to compare against a ProsemirrorNode
 * All keys are properties or property chains that will be resolved against the node
 * The resolved property value will be checked against the tree's value for that key
 * `content` contains one compare tree for each child of the ProsemirrorNode and can be arbitrarily deeply nested
 */
type CompareTree = {
    [propertyChain: string]: unknown;
    content?: CompareTree[];
};

/** {@inheritDoc jest.Matchers<R>.toMatchNodeTree} */
function expectNodeTree(doc: ProsemirrorNode, tree: CompareTree): void {
    const keys = Object.keys(tree);

    // go through every set key on the CompareTree
    keys.forEach((k) => {
        // skip the content key, it is a special case
        if (k === "content") {
            return;
        }

        // resolve the property chain on the object
        const propValue = deepProp(doc, k);

        // check that the value on our tree matches the value on the object
        try {
            expect(propValue).toEqual(tree[k]);
        } catch (e: unknown) {
            throw `Mismatch on property \`${k}\`\n${e?.toString()}`;
        }
    });

    // only check the content/count if either childCount or content is specified
    // doing so allows us to not have to build the entire tree out if we only want to check up to a single level
    if ("childCount" in tree || "content" in tree) {
        // the number of children *must* match the amount we've listed in our tree
        const contentLength = tree.content
            ? tree.content.length
            : tree.childCount;
        // check that the value on our tree matches the value on the object
        try {
            expect(doc.content.childCount).toEqual(contentLength);
        } catch (e: unknown) {
            throw `Unexpected number of children \n${e?.toString()}\nReceived: ${JSON.stringify(
                doc.content.toJSON()
            )}`;
        }
    }

    // go through each child compare tree and compare to the node's children recursively
    if (tree.content && tree.content.length) {
        tree.content.forEach((c, i) => {
            expectNodeTree(doc.content.child(i), c);
        });
    }
}

/**
 * Creates a simple nested node tree with the passed in path
 * @param input valid node names separated by a `>` symbol, and optionally ending in a number of child nodes
 * @returns a CompareTree to be used with `toMatchNodeTree`
 */
export function createBasicNodeTree(input: string): CompareTree {
    const branches = input.split(">").map((x) => x.trim());

    if (!branches.length) return {};

    const root: CompareTree = {
        "type.name": "doc",
    };
    let tree = root;

    for (const branch of branches) {
        const child = {
            "type.name": branch,
        };
        tree.content = [child];
        tree = child;
    }

    return root;
}

/** {@inheritDoc jest.Matchers<R>.toMatchNodeTree} */
function toMatchNodeTree(
    doc: ProsemirrorNode,
    tree: CompareTree
): jest.CustomMatcherResult {
    // call the backing expect wrapper
    expectNodeTree(doc, tree);

    return {
        // no error message on pass - we don't support "not" here
        message: () => null,
        // always assume a pass, expectNodeTree will throw an exception if it doesn't
        pass: true,
    };
}

expect.extend({
    toMatchNodeTree,
    toMatchNodeTreeString(doc: ProsemirrorNode, tree: string) {
        return toMatchNodeTree(doc, createBasicNodeTree(tree));
    },
});
