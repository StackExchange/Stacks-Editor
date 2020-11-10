import { EditorState } from "prosemirror-state";

/**
 * Recursively deep merges two objects into a new object, leaving the original two untouched
 * NOTE: Arrays are only shallow merged
 * @param object1 The object to base the merge off of
 * @param object2 The object to merge into the base object
 */
export function deepMerge(object1: unknown, object2: unknown): unknown {
    return mergeObject(object1, object2);
}

function isPlainObject(obj: unknown): boolean {
    // not an object type
    if (!(obj instanceof Object)) {
        return false;
    }

    if (obj instanceof Function) {
        return false;
    }

    if (obj instanceof Array) {
        return false;
    }

    // probably an object
    return true;
}

function mergeObject(object1: unknown, object2: unknown): unknown {
    // if both are arrays, shallow merge (else, non-object merge)
    if (object1 instanceof Array && object2 instanceof Array) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment
        return [...object1, ...object2];
    }

    const obj1IsObject = isPlainObject(object1);
    const obj2IsObject = isPlainObject(object2);

    // if the first item is not an object, return a clone of the second
    if (!obj1IsObject && obj2IsObject) {
        return mergeObject({}, object2);
    }
    // if the second is not an object, return a clone of the first
    else if (obj1IsObject && !obj2IsObject) {
        return mergeObject({}, object1);
    }
    // if neither are objects, return the second item
    else if (!obj1IsObject && !obj2IsObject) {
        return object2;
    }

    const outObject: { [key: string]: unknown } = {};

    // we know these are objects (from above), so retype them now
    const obj1 = object1 as Record<string, unknown>;
    const obj2 = object2 as Record<string, unknown>;

    // start merging all the keys from the first object
    let keys = Object.keys(obj1);

    for (const key of keys) {
        if (key in obj2) {
            outObject[key] = mergeObject(obj1[key], obj2[key]);
        } else {
            outObject[key] = obj1[key];
        }
    }

    // set all leftover keys from object2
    keys = Object.keys(obj2);
    for (const key of keys) {
        // we already merged these keys, skip
        if (key in outObject) {
            continue;
        }

        outObject[key] = obj2[key];
    }

    return outObject;
}

/**
 * Compares two states and returns true if the doc has changed between them.
 * The doc is considered changed if:
 *      * its content changed
 *      * the selection has changed
 *      * the stored marks have changed
 * @param prevState The "old" / previous editor state
 * @param newState The "new" / current editor state
 */
export function docChanged(
    prevState: EditorState,
    newState: EditorState
): boolean {
    // if either are null, just return "changed"
    if (!prevState || !newState) {
        return true;
    }

    return (
        !prevState.selection.eq(newState.selection) ||
        !prevState.doc.eq(newState.doc) ||
        prevState.storedMarks !== newState.storedMarks
    );
}

export type StickyChangeDetails = {
    target: Element;
    stuck: boolean;
};

/** The class to attach sticky observers to */
export const STICKY_OBSERVER_CLASS = "js-sticky";

// TODO should this go into Stacks proper?
/**
 * Starts observers watching all .STICKY_OBSERVER_CLASS elements for a change in stuck position
 * @param container The container to search for STICKY_OBSERVER_CLASS elements (usually the closest scrolling parent)
 * @fires sticky-change
 */
export function startStickyObservers(container: Element): void {
    const observer = new IntersectionObserver(
        function (entries: IntersectionObserverEntry[]) {
            for (const entry of entries) {
                const stuck = !entry.isIntersecting;
                const target = entry.target.nextElementSibling;

                /**
                 * sticky-change event
                 * @event sticky-change
                 * @type {object}
                 * @property {boolean} detail.stuck - Indicates whether the target is stuck
                 * @property {Element} detail.target - The targeted position:sticky element
                 */
                const e = new CustomEvent<StickyChangeDetails>(
                    "sticky-change",
                    {
                        detail: { stuck, target },
                    }
                );
                document.dispatchEvent(e);
            }
        },
        {
            threshold: [0],
            root: container,
        }
    );

    container.querySelectorAll("." + STICKY_OBSERVER_CLASS).forEach((el) => {
        const sentinel = document.createElement("div");
        // not altogether necessary, but let's label the div so others know what this is and where it is coming from
        sentinel.className = "js-sticky-sentinel";
        // add right before the sticky element; if this element becomes obscured, then the sticky is unstuck
        el.parentNode.insertBefore(sentinel, el);
        observer.observe(sentinel);
    });
}
