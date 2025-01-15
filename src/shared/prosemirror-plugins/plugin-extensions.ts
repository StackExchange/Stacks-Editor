import {
    Plugin,
    PluginSpec,
    PluginKey,
    Transaction,
    StateField,
    EditorState,
    PluginView,
    EditorStateConfig,
} from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { log } from "../logger";

/**
 * Extended StateField that overrides the `this` of all methods to be `StatefulPlugin` instead of just `Plugin`
 */
interface StatefulPluginStateField<
    T,
    TThis extends StatefulPlugin<T> = StatefulPlugin<T>,
> extends StateField<T> {
    /** @inheritdoc */
    init(this: TThis, config: EditorStateConfig, instance: EditorState): T;
    /** @inheritdoc */
    apply(
        this: TThis,
        tr: Transaction,
        value: T,
        oldState: EditorState,
        newState: EditorState
    ): T;
    /** @inheritdoc */
    toJSON?: (this: TThis, value: T) => unknown;
    /** @inheritdoc */
    fromJSON?: (
        this: TThis,
        config: EditorStateConfig,
        value: unknown,
        state: EditorState
    ) => T;
}

export interface StatefulPluginSpec<
    T,
    TThis extends StatefulPlugin<T> = StatefulPlugin<T>,
> extends PluginSpec<T> {
    /** @inheritdoc */
    key: StatefulPluginKey<T>;
    /** @inheritdoc */
    state: StatefulPluginStateField<T, TThis> | null;
}

export class StatefulPluginKey<T> extends PluginKey<T> {
    constructor(name?: string) {
        super(name);
    }

    /** @inheritdoc */
    get(state: EditorState): StatefulPlugin<T> | null | undefined {
        return super.get(state) as StatefulPlugin<T>;
    }

    setMeta(tr: Transaction, data: T): Transaction {
        return tr.setMeta(this, data);
    }
}

export class StatefulPlugin<T> extends Plugin<T> {
    declare spec: StatefulPluginSpec<T>;

    constructor(spec: StatefulPluginSpec<T>) {
        super(spec);
    }

    get transactionKey(): StatefulPluginKey<T> {
        return this.spec.key;
    }

    getMeta(tr: Transaction): T {
        return tr.getMeta(this.transactionKey) as T;
    }
}

interface WrappedAsyncState<T, TCallback> {
    state: T;
    callbackData: TCallback;
}

export class AsyncPluginKey<T, TCallback> extends StatefulPluginKey<T> {
    constructor(name?: string) {
        super(name);
    }

    /** @inheritdoc */
    setMeta(tr: Transaction, data: T): Transaction {
        const wrappedData: WrappedAsyncState<T, TCallback> = {
            callbackData: null,
            state: data,
        };
        return tr.setMeta(this, wrappedData);
    }

    setCallbackData(tr: Transaction, data: TCallback): Transaction {
        const wrappedData: WrappedAsyncState<T, TCallback> = {
            callbackData: data,
            state: null,
        };
        return tr.setMeta(this, wrappedData);
    }

    dispatchCallbackData(view: EditorView, data: TCallback): Transaction {
        const tr = this.setCallbackData(view.state.tr, data);
        view.updateState(view.state.apply(tr));
        return tr;
    }
}

export interface AsyncPluginSpec<T, TCallback>
    extends StatefulPluginSpec<T, AsyncPlugin<T, TCallback>> {
    key: AsyncPluginKey<T, TCallback>;
    asyncCallback: (
        view: EditorView,
        prevState: EditorState
    ) => Promise<TCallback>;
}

class AsyncViewHandler<T, TCallback> implements PluginView {
    private callback: (
        view: EditorView,
        prevState: EditorState
    ) => Promise<TCallback>;
    private inProgressPromise: number | null;
    private transactionKey: AsyncPluginKey<T, TCallback>;

    constructor(
        view: EditorView,
        transactionKey: AsyncPluginKey<T, TCallback>,
        callback: (
            view: EditorView,
            prevState: EditorState
        ) => Promise<TCallback>
    ) {
        this.callback = callback;
        this.transactionKey = transactionKey;

        // go ahead and call this first to initialize the plugin
        this.attachCallback(view, null);
    }

    // on document update, call the callback again
    update(view: EditorView, prevState: EditorState) {
        // if the doc didn't change, don't update
        if (view.state.doc.eq(prevState.doc)) {
            return;
        }

        // attach a new callback to this instance
        this.attachCallback(view, prevState);
    }

    destroy() {
        // do nothing, let the plugin clean itself up
    }

    private attachCallback(view: EditorView, prevState: EditorState): void {
        const promiseId = (this.inProgressPromise = Math.random());

        this.callback(view, prevState)
            .then((data) => {
                // if another promise has been initialized before this one finished, cancel
                if (promiseId !== this.inProgressPromise) {
                    log(
                        "AsyncViewHandler attachCallback",
                        "cancelling promise update due to another callback taking its place"
                    );
                    return;
                }

                this.inProgressPromise = null;

                // let the document know this callback has finished
                this.transactionKey.dispatchCallbackData(view, data);
            })
            // on error, don't dispatch, just clear
            .catch(() => {
                this.inProgressPromise = null;
            });
    }
}

/**
 * Shortcut wrapper for a plugin with async functionality;
 * Overrides the spec's `view` property to manually handle async functionality
 */
export class AsyncPlugin<T, TCallback> extends StatefulPlugin<T> {
    constructor(spec: AsyncPluginSpec<T, TCallback>) {
        spec.view = (view: EditorView) => {
            return new AsyncViewHandler<T, TCallback>(
                view,
                spec.key,
                spec.asyncCallback
            );
        };

        super(spec);
    }

    /** @inheritdoc */
    getMeta(tr: Transaction): T {
        const metadata = tr.getMeta(this.transactionKey) as WrappedAsyncState<
            T,
            TCallback
        >;
        return metadata?.state;
    }

    getCallbackData(tr: Transaction): TCallback {
        const metadata = tr.getMeta(this.transactionKey) as WrappedAsyncState<
            T,
            TCallback
        >;
        return metadata?.callbackData;
    }
}
