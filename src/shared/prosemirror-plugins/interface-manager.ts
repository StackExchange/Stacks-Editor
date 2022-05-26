import { EditorView } from "prosemirror-view";
import { dispatchEditorEvent } from "../utils";
import { PluginView } from "../view";
import { StatefulPlugin, StatefulPluginKey } from "./plugin-extensions";

/**
 * The required state properties for a plugin that provides an interface
 */
interface ManagedInterfaceState {
    /** Whether the plugin's interface should be showing */
    shouldShow: boolean;
}

/** The state of the interface manager meta-plugin */
interface InterfaceManagerState {
    /** The currently shown interface or null if no interface is shown */
    currentlyShown: ManagedInterfaceKey<ManagedInterfaceState> | null;
    /** Getter to fetch the plugin container from the view's DOM */
    containerGetter: (view: EditorView) => Element;
}

/** The data properties that can be passed into show/hideInterface for state overriding */
type InterfaceData<T extends ManagedInterfaceState> = Partial<
    Omit<T, "shouldShow">
>;

/**
 * The central plugin key where all show/hideInterface requests come into.
 * This should *never* be exported. Any functionality that wants to use this must inherit from
 * @see {@link ManagedInterfaceKey} and use its show/hideInterface methods.
 */
class MainInterfaceManagerKey extends StatefulPluginKey<InterfaceManagerState> {
    constructor() {
        super("interface-manager");
    }

    /**
     * Shows the interface for the plugin referenced by the passed key
     * @param view The current editor view
     * @param toShow The key of the plugin to show
     * @param data Any data to attach to the transaction's metadata
     * @returns true if the interface was shown, false if there was no state change
     */
    showInterface<T extends ManagedInterfaceState>(
        view: EditorView,
        toShow: ManagedInterfaceKey<T>,
        data: InterfaceData<T>
    ): boolean {
        // even though the TS types forbid this, it could still be passed in
        if (data && "shouldShow" in data) {
            delete (data as unknown as { shouldShow: boolean })["shouldShow"];
        }

        const state: T = {
            ...toShow.getState(view.state),
            ...data,
        };

        // check validity
        if (!this.checkIfValid(state, true)) {
            return false;
        }

        // hide existing TODO batch transactions?
        this.hideCurrentInterface(view);

        // dispatch cancelable event and return early if canceled
        if (this.dispatchCancelableEvent(view, `${toShow.name}-show`, state)) {
            return false;
        }

        // dispatch transaction for managed plugin
        let tr = view.state.tr;
        tr = toShow.setMeta(tr, {
            ...state,
            shouldShow: true,
        } as T);

        // set metadata for this plugin
        const { containerGetter } = this.getState(view.state);
        tr = this.setMeta(tr, {
            currentlyShown: toShow,
            containerGetter,
        });

        // dispatch transaction
        view.dispatch(tr);

        return true;
    }

    /**
     * Hides the interface for the plugin referenced by the passed key
     * @param view The current editor view
     * @param toHide The key of the plugin to show
     * @param data Any data to attach to the transaction's metadata
     * @returns true if the interface was hidden, false if there was no state change
     */
    hideInterface<T extends ManagedInterfaceState>(
        view: EditorView,
        toHide: ManagedInterfaceKey<T>,
        data: InterfaceData<T>
    ): boolean {
        // even though the TS types forbid this, it could still be passed in
        if (data && "shouldShow" in data) {
            delete (data as unknown as { shouldShow: boolean })["shouldShow"];
        }

        const state: T = {
            ...toHide.getState(view.state),
            ...data,
        };

        // check validity
        if (!this.checkIfValid(state, false)) {
            return false;
        }

        // dispatch cancelable event and return early if canceled
        if (this.dispatchCancelableEvent(view, `${toHide.name}-hide`, state)) {
            return false;
        }

        // dispatch transaction for managed plugin
        let tr = view.state.tr;
        tr = toHide.setMeta(tr, {
            ...state,
            shouldShow: false,
        } as T);

        // set metadata for this plugin
        const { containerGetter } = this.getState(view.state);
        tr = this.setMeta(tr, {
            currentlyShown: null,
            containerGetter,
        });

        // dispatch transaction
        view.dispatch(tr);

        return true;
    }

    hideCurrentInterface(view: EditorView): boolean {
        const { currentlyShown } = this.getState(view.state);

        if (!currentlyShown) {
            return true;
        }

        return this.hideInterface(view, currentlyShown, {
            shouldShow: false,
        });
    }

    // TODO CLEANUP
    private checkIfValid<T extends ManagedInterfaceState>(
        state: Partial<T>,
        checkingIsShown: boolean
    ): boolean {
        // check if the state we're expecting is set
        if (checkingIsShown) {
            // already visible, don't dispatch the event
            return !("shouldShow" in state) || !state.shouldShow;
        } else {
            // already hidden, don't dispatch the event
            return state.shouldShow;
        }
    }

    private dispatchCancelableEvent<T>(
        view: EditorView,
        eventName: string,
        data: T
    ): boolean {
        return !dispatchEditorEvent(view.dom, eventName, data);
    }
}

/** Singleton instance of @see {@link MainInterfaceManagerKey} */
const MAIN_INTERFACE_MANAGER_KEY = new MainInterfaceManagerKey();

/**
 * Public PluginKey implementation for plugins that want to expose an interface.
 * Contains helper methods for showing/hiding the interface that ensure that the manager
 * handles the state changes across all interface-enabled plugins.
 */
export class ManagedInterfaceKey<
    T extends ManagedInterfaceState
> extends StatefulPluginKey<T> {
    readonly name: string;

    constructor(name: string) {
        super(name);
        this.name = name;
    }

    /**
     * Gets the container element that the plugin's interface should be rendered into
     * @param view The current editor view
     */
    getContainer(view: EditorView): Element {
        return MAIN_INTERFACE_MANAGER_KEY.getState(view.state).containerGetter(
            view
        );
    }

    /**
     * Shows the interface for this plugin, optionally overriding the metadata passed to the transaction
     * @param view The current editor view
     * @param data Optional data to attach to the transaction's metadata
     * @returns True if the interface was shown, false if there was no state change
     */
    showInterface(view: EditorView, data?: InterfaceData<T>): boolean {
        return MAIN_INTERFACE_MANAGER_KEY.showInterface(view, this, data);
    }

    /**
     * Hides the interface for this plugin, optionally overriding the metadata passed to the transaction
     * @param view The current editor view
     * @param data Optional data to attach to the transaction's metadata
     * @returns True if the interface was hidden, false if there was no state change
     */
    hideInterface(view: EditorView, data?: InterfaceData<T>): boolean {
        return MAIN_INTERFACE_MANAGER_KEY.hideInterface(view, this, data);
    }
}

/**
 * Main plugin for coordinating the use of the interface container for all interface-enabled plugins.
 * This plugin is *required* for any interface-enabled plugin to work. This plugin also adds a listener to hide the interface
 * if the ESC key is pressed.
 * @param containerGetter The method for getting the container element for the interface; falls back to the editor view's DOM's parentElement if not provided
 */
export function interfaceManagerPlugin(
    containerGetter: InterfaceManagerState["containerGetter"]
) {
    containerGetter =
        containerGetter ||
        function (view) {
            return view.dom.parentElement;
        };
    return new StatefulPlugin<InterfaceManagerState>({
        key: MAIN_INTERFACE_MANAGER_KEY,
        state: {
            init: () => ({
                currentlyShown: null,
                containerGetter,
            }),
            apply(tr, value) {
                return {
                    ...value,
                    ...this.getMeta(tr),
                };
            },
        },
        props: {
            handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
                // if the ESC key is pressed, then hide the interface
                if (event.key === "Escape") {
                    MAIN_INTERFACE_MANAGER_KEY.hideCurrentInterface(view);
                }

                // don't stop the event from propagating
                return false;
            },
        },
    });
}

/**
 * PluginView that ensures that the build/destroyInterface methods are called only at the appropriate times.
 * **WARNING**: The plugin that uses this must also ensure that it forwards the `shouldShow` value from any
 * apply transaction's metadata to the plugin's state. Failing to do so will result in the interface never being shown.
 */
export abstract class PluginInterfaceView<
    TData extends ManagedInterfaceState,
    TKey extends ManagedInterfaceKey<TData>
> implements PluginView
{
    protected key: TKey;
    protected isShown: boolean;

    constructor(key: TKey) {
        this.key = key;
        this.isShown = false;
    }

    /**
     * Method that is called when the plugin's interface is shown.
     * This should append any DOM elements that should be shown to the user.
     * @param container The element to render the interface into
     */
    abstract buildInterface(container: Element): void;

    /**
     * Method that is called when the plugin's interface is hidden.
     * Typically, this should completely clear out the container's contents that were added in buildInterface
     * and clean up any other resources such as events that were attached to document.
     * @param container The element the interface was rendered into
     */
    abstract destroyInterface(container: Element): void;

    /**
     * Pre-implemented update override that ensures that the interface is shown/hidden appropriately.
     * If you need to do additional work, you should override this method, making sure to call `super.update(view)`
     * in the overridden method.
     * @param view The current editor view
     */
    update(view: EditorView): void {
        const { shouldShow } = this.key.getState(view.state);

        // only show/hide if the state has changed
        if (this.isShown && !shouldShow) {
            // hide the interface
            this.destroyInterface(this.key.getContainer(view));
            this.isShown = false;
        } else if (!this.isShown && shouldShow) {
            // show the interface
            this.buildInterface(this.key.getContainer(view));
            this.isShown = true;
        }
    }

    /** Helper wrapper around this key's @see {@link ManagedInterfaceKey.showInterface} */
    protected tryShowInterface(
        view: EditorView,
        data?: InterfaceData<TData>
    ): boolean {
        return this.key.showInterface(view, data);
    }

    /** Helper wrapper around this key's @see {@link ManagedInterfaceKey.hideInterface} */
    protected tryHideInterface(
        view: EditorView,
        data?: InterfaceData<TData>
    ): boolean {
        return this.key.hideInterface(view, data);
    }
}
