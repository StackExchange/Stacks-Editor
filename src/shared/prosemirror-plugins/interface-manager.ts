import { EditorState, PluginView, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { dispatchEditorEvent } from "../utils";
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
    dom: HTMLElement;
    /** The currently shown interface or null if no interface is shown */
    currentlyShown: ManagedInterfaceKey<ManagedInterfaceState> | null;
    /** Getter to fetch the plugin container from the view's DOM */
    containerGetter: (view: EditorView) => Element;
}

/** The data properties that can be passed into show/hideInterface for state overriding */
type InterfaceData<T extends ManagedInterfaceState> = Partial<
    Omit<T, "shouldShow" | "dom">
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
    showInterfaceTr<T extends ManagedInterfaceState>(
        viewState: EditorState,
        toShow: ManagedInterfaceKey<T>,
        data: InterfaceData<T>
    ): Transaction {
        // even though the TS types forbid this, it could still be passed in
        if (data && "shouldShow" in data) {
            delete (data as unknown as { shouldShow: boolean })["shouldShow"];
        }

        const state: T = {
            ...toShow.getState(viewState),
            ...data,
        };

        // check validity
        if (!this.checkIfValid(state, true)) {
            return null;
        }

        // hide existing
        let tr = this.hideCurrentInterfaceTr(viewState) || viewState.tr;

        // dispatch cancelable event and return early if canceled
        if (
            this.dispatchCancelableEvent(
                viewState,
                `${toShow.name}-show`,
                state
            )
        ) {
            return null;
        }

        // dispatch transaction for managed plugin
        tr = toShow.setMeta(tr, {
            ...state,
            shouldShow: true,
        } as T);

        // set metadata for this plugin
        const { containerGetter, dom } = this.getState(viewState);
        tr = this.setMeta(tr, {
            dom,
            currentlyShown: toShow,
            containerGetter,
        });

        return tr;
    }

    /**
     * Hides the interface for the plugin referenced by the passed key
     * @param view The current editor view
     * @param toHide The key of the plugin to show
     * @param data Any data to attach to the transaction's metadata
     * @returns true if the interface was hidden, false if there was no state change
     */
    hideInterfaceTr<T extends ManagedInterfaceState>(
        viewState: EditorState,
        toHide: ManagedInterfaceKey<T>,
        data: InterfaceData<T>
    ): Transaction {
        // even though the TS types forbid this, it could still be passed in
        if (data && "shouldShow" in data) {
            delete (data as unknown as { shouldShow: boolean })["shouldShow"];
        }

        const state: T = {
            ...toHide.getState(viewState),
            ...data,
        };

        // check validity
        if (!this.checkIfValid(state, false)) {
            return null;
        }

        // dispatch cancelable event and return early if canceled
        if (
            this.dispatchCancelableEvent(
                viewState,
                `${toHide.name}-hide`,
                state
            )
        ) {
            return null;
        }

        // dispatch transaction for managed plugin
        let tr = viewState.tr;
        tr = toHide.setMeta(tr, {
            ...state,
            shouldShow: false,
        } as T);

        // set metadata for this plugin
        const { containerGetter, dom } = this.getState(viewState);
        tr = this.setMeta(tr, {
            dom,
            currentlyShown: null,
            containerGetter,
        });

        return tr;
    }

    hideCurrentInterfaceTr(viewState: EditorState): Transaction {
        const { currentlyShown } = this.getState(viewState);

        if (!currentlyShown) {
            return null;
        }

        return this.hideInterfaceTr(viewState, currentlyShown, {
            shouldShow: false,
        });
    }

    /**
     * Checks if the the requested state change is valid
     * @param state The current plugin state
     * @param checkingIsShown Whether the state is being checked for being shown
     */
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

    /**
     * Dispatches an event to the editor view's DOM that can be canceled
     * @param state The current editor state
     * @param eventName The unprefixed name of the event to dispatch
     * @param data The current plugin state
     */
    private dispatchCancelableEvent<T>(
        state: EditorState,
        eventName: string,
        data: T
    ): boolean {
        const dom = this.getState(state).dom;
        return !dispatchEditorEvent(dom, eventName, data);
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
    showInterfaceTr(state: EditorState, data?: InterfaceData<T>): Transaction {
        return MAIN_INTERFACE_MANAGER_KEY.showInterfaceTr(state, this, data);
    }

    /**
     * Hides the interface for this plugin, optionally overriding the metadata passed to the transaction
     * @param view The current editor view
     * @param data Optional data to attach to the transaction's metadata
     * @returns True if the interface was hidden, false if there was no state change
     */
    hideInterfaceTr(state: EditorState, data?: InterfaceData<T>): Transaction {
        return MAIN_INTERFACE_MANAGER_KEY.hideInterfaceTr(state, this, data);
    }
}

/**
 * Main plugin for coordinating the use of the interface container for all interface-enabled plugins.
 * This plugin is *required* for any interface-enabled plugin to work. This plugin also adds a listener to hide the interface
 * if the ESC key is pressed or if the text editor gains focus.
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
                dom: null,
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
                    const tr =
                        MAIN_INTERFACE_MANAGER_KEY.hideCurrentInterfaceTr(
                            view.state
                        );
                    if (tr) {
                        view.dispatch(tr);
                    }
                }

                // don't stop the event from propagating
                return false;
            },
            handleClick(view: EditorView) {
                // if the editor is clicked, then hide the interface
                MAIN_INTERFACE_MANAGER_KEY.hideCurrentInterface(view);
                return false;
            },
        },
        view: (editorView: EditorView) => {
            editorView.dispatch(
                MAIN_INTERFACE_MANAGER_KEY.setMeta(editorView.state.tr, {
                    dom: editorView.dom,
                    currentlyShown: null,
                    containerGetter,
                })
            );
            return {};
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
    protected tryShowInterfaceTr(
        state: EditorState,
        data?: InterfaceData<TData>
    ): Transaction {
        return this.key.showInterfaceTr(state, data);
    }

    /** Helper wrapper around this key's @see {@link ManagedInterfaceKey.hideInterface} */
    protected tryHideInterfaceTr(
        state: EditorState,
        data?: InterfaceData<TData>
    ): Transaction {
        return this.key.hideInterfaceTr(state, data);
    }
}
