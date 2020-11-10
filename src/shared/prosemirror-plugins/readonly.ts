import { Plugin, PluginKey, EditorState, Transaction } from "prosemirror-state";

// TODO document
const READ_ONLY_KEY = new PluginKey<boolean>(readonlyPlugin.name);

// TODO document
export function editableCheck(state: EditorState): boolean {
    return !READ_ONLY_KEY.getState(state);
}

/**
 * Toggles the stored `readonly` plugin state
 * @param isReadonly Whether to toggle readonly on or not
 */
export function toggleReadonly(
    isReadonly: boolean,
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    const isCurrentlyRO = READ_ONLY_KEY.getState(state);

    // if the state already matches the expected result, return
    if (isCurrentlyRO === isReadonly) {
        return false;
    }

    let tr = state.tr.setMeta(READ_ONLY_KEY, isReadonly);
    tr = tr.setMeta("addToHistory", false);

    if (dispatch) {
        dispatch(tr);
    }

    return true;
}

// TODO document
export function readonlyPlugin(): Plugin {
    return new Plugin<boolean>({
        key: READ_ONLY_KEY,
        state: {
            init() {
                return false;
            },
            apply(tr, value) {
                const meta = tr.getMeta(READ_ONLY_KEY) as boolean | undefined;

                if (typeof meta === "undefined") {
                    return value;
                }

                return meta;
            },
        },
    });
}
