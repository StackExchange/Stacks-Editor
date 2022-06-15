import { EditorState } from "prosemirror-state";
import { ExternalPluginProvider } from "../src/shared/editor-plugin";

/**
 * Normalize HTML given as a string representation.
 * This is useful if you want to compare expected and actual HTML
 * but don't really care about whitespace, attribute order and
 * differences in quotation characters.
 *
 * This function will strip all whitespace between tags, so your
 * output might look a little less pretty than what you had before.
 * @param htmlString - the string representation of your HTML
 */
export function normalize(htmlString: string): string {
    const div = document.createElement("div");
    // NOTE: tests only, no XSS danger
    // eslint-disable-next-line no-unsanitized/property
    div.innerHTML = htmlString.replace(/^\s+</gm, "<").replace(/\r?\n/g, "");
    return div.innerHTML;
}

/**
 * Converts a string with arbitrary HTML into a proper Node
 * @param htmlString - the string representation of the HTML that should be converted
 */
export function toNode(htmlString: string): Node {
    const div = document.createElement("div");
    // NOTE: tests only, no XSS danger
    // eslint-disable-next-line no-unsanitized/property
    div.innerHTML = htmlString;
    return div.firstChild;
}

/**
 * Gets the currently selected text from the state
 */
export function getSelectedText(state: EditorState): string {
    const { to, from } = state.selection;

    return state.doc.textBetween(from, to);
}
