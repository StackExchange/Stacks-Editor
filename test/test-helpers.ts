import {
    EditorState,
    Plugin,
    PluginView,
    Transaction,
} from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import {
    EditorPlugin,
    ExternalPluginProvider,
} from "../src/shared/editor-plugin";

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

/**
 * Returns a mocked external plugin provider for testing
 */
export function externalPluginProvider(plugins?: EditorPlugin[]) {
    return new ExternalPluginProvider(plugins || [], null);
}

type PluginViewConstructor<T extends PluginView> = {
    new (...args: unknown[]): T;
};
/** Gets the first plugin view from the view of type T */
export function getPluginViewInstance<T extends PluginView>(
    editorView: EditorView,
    type: PluginViewConstructor<T>
): T | null {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error not exposed to consumers, but I don't care :P
    return (editorView.pluginViews as PluginView[]).find(
        (pv) => pv instanceof type
    ) as T;
}

/** Attempts to get a plugin based on the key's name */
export function getPluginByName(
    state: EditorState,
    name: string
): Plugin | null {
    return state.plugins.find(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error not exposed to consumers, but this is a hack for tests so...
        (p) => p.spec.key?.name === name || p.key === name + "$"
    );
}

/** Attempts to get the state from a plugin based on the key's name */
export function getPluginStateByName<T>(state: EditorState, name: string): T {
    const plugin = getPluginByName(state, name);
    if (plugin) {
        return plugin.getState(state) as T;
    }
    return null;
}

/**
 * Intercepts the view's dispatch function after it is applied, then calls the callback with the new state and triggering transaction
 * @param view The editor view to intercept
 * @param callback The callback to call; returning false will prevent the promise from resolving
 * @returns A promise that is resolved when the callback returns true
 */
export function onViewDispatch(
    view: EditorView,
    callback: (newView: EditorView, tr: Transaction) => boolean
) {
    return new Promise<void>((resolve, reject) => {
        view.setProps({
            dispatchTransaction(this: EditorView, tr) {
                try {
                    const newState = this.state.apply(tr);
                    this.updateState(newState);
                    if (callback(this, tr)) {
                        resolve();
                    }
                } catch (e) {
                    reject(e);
                }
            },
        });
    });
}
