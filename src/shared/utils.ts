import MarkdownIt from "markdown-it";
import { EditorState } from "prosemirror-state";
import { error } from "./logger";
import { EditorView } from "prosemirror-view";

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
 *      * the stored marks have changed
 * @param prevState The "old" / previous editor state
 * @param newState The "new" / current editor state
 */
export function docNodeChanged(
    prevState: EditorState,
    newState: EditorState
): boolean {
    // if either are null, just return "changed"
    if (!prevState || !newState) {
        return true;
    }

    return (
        !prevState.doc.eq(newState.doc) ||
        prevState.storedMarks !== newState.storedMarks
    );
}

/**
 * Compares two states and returns true if the doc has changed between them.
 * The doc is considered changed if:
 *      * the document node changed (@see docNodeChanged)
 *      * the selection has changed
 * @param prevState The "old" / previous editor state
 * @param newState The "new" / current editor state
 */
export function docChanged(
    prevState: EditorState,
    newState: EditorState
): boolean {
    return (
        docNodeChanged(prevState, newState) ||
        !prevState.selection.eq(newState.selection)
    );
}

/**
 * Returns the text node the cursor is currently anchored in
 * @param state The current editor state
 * @returns A text node or null if the cursor is not in a text node
 */
export function getCurrentTextNode(state: EditorState) {
    if (!state.selection.$anchor.textOffset) {
        return null;
    }

    const $anchor = state.selection.$anchor;
    return $anchor.parent.child($anchor.index());
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

// rudimentary link validation that's roughly in line with what Stack Overflow's backend uses for validation
const validLinkRegex =
    /^((https?|ftp):\/\/|\/)[-a-z0-9+&@#/%?=~_|!:,.;()*[\]$]+$/;
const validMailtoRegex = /^mailto:[#-.\w]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+$/;

/**
 * Checks if a url is well-formed and passes Stack Overflow's validation checks
 * @param url The url to validate
 */
export function stackOverflowValidateLink(url: string): boolean {
    const normalizedUrl = url?.trim().toLowerCase();
    return (
        validLinkRegex.test(normalizedUrl) ||
        validMailtoRegex.test(normalizedUrl)
    );
}

/**
 * Template function to escape all html in substitutions, but not the rest of the template.
 * For instance, escapeHTML`<p>${"<span>user input</span>"}</p>` will escape the inner span, but not the outer p tags.
 * Uses markdown-it's @see escapeHtml in the background
 */
export function escapeHTML(
    strings: TemplateStringsArray,
    ...subs: unknown[]
): string {
    let output = strings[0];
    for (let i = 0, len = subs.length; i < len; i++) {
        output +=
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            new MarkdownIt().utils.escapeHtml(subs[i]?.toString() || "") +
            strings[i + 1];
    }

    return output;
}

/** Gets the modifier key for the current platform; i.e. "Command" on macOS and "Control" elsewhere */
export function getPlatformModKey(): "Cmd" | "Ctrl" {
    return /Mac|iP(hone|[oa]d)/.test(navigator.platform) ? "Cmd" : "Ctrl";
}

/**
 * Returns a string containing the label and readable keyboard shortcut for button tooltips
 * @param mapping Corresponding command mapping (keyboard shortcut)
 */
export function getShortcut(mapping: string): string {
    if (!mapping.startsWith("Mod-")) {
        return mapping;
    }

    return getPlatformModKey() + mapping.slice(3);
}

/**
 * Prefixes an event name to scope it to the editor
 * e.g. `view-change` becomes `StacksEditor:view-change`
 * @param eventName The event name to prefix
 */
function prefixEventName(eventName: string) {
    return `StacksEditor:${eventName}`;
}

/**
 * Generated a random id that can be used to ensure DOM element ids are unique
 * @returns a random string
 */
export function generateRandomId(): string {
    return (Math.random() * 10000).toFixed(0);
}

/**
 * Prefixes and dispatches a custom event on the target
 * @param target The target to dispatch the event on
 * @param eventName The unprefixed event name
 * @param detail Any custom data to pass on the event
 * @returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise
 */
export function dispatchEditorEvent(
    target: Element,
    eventName: string,
    detail?: unknown
): boolean {
    const event = new CustomEvent(prefixEventName(eventName), {
        bubbles: true,
        cancelable: true,
        detail: detail,
    });
    return target.dispatchEvent(event);
}

/** Helper type that recursively makes an object and all its children Partials */
export type PartialDeep<T> = { [key in keyof T]?: PartialDeep<T[key]> };

/**
 * Kebab cases a string e.g. "backgroundColor" to "background-color"
 * @param str input string
 */
function toKebabCase(str: string) {
    return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

/**
 * Sets attributes from an object onto an html element;
 * style, class* and on* attributes will be ignored;
 * @param el The element to set the attributes on
 * @param attrs The key/value attributes to set onto the element
 * @internal
 */
export function setAttributesOnElement(
    el: HTMLElement,
    attrs: Record<string, unknown>
): void {
    Object.entries(attrs).forEach(([key, val]) => {
        if (
            key === "style" ||
            key.startsWith("class") ||
            key.startsWith("on")
        ) {
            error(
                "setAttributesOnElement",
                `Setting the "${key}" attribute is not supported`
            );
            return;
        }

        if (val !== false) {
            // set falsy values, but don't set properties that are explicitly false
            // otherwise, use setAttribute to set the string representation
            el.setAttribute(toKebabCase(key), val === true ? "" : String(val));
        }
    });
}
