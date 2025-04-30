import { EditorState, Plugin, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { error } from "../../shared/logger";
import {
    StatefulPlugin,
    StatefulPluginKey,
} from "../../shared/prosemirror-plugins/plugin-extensions";
import { docNodeChanged } from "../../shared/utils";
import type { CommonmarkOptions, PreviewRenderer } from "../editor";

/**
 * The amount of time to delay rendering since the last render;
 * Setting to a high value will result in less frequent renders as users type
 */
const DEFAULT_RENDER_DELAY_MS = 100;

/** The internal state used by the preview plugin */
interface PreviewPluginState {
    isShown: boolean;
}

/** The PluginView for the plugin created in @see createPreviewPlugin that controls the rendered markdown preview */
class PreviewView implements PluginView {
    dom: HTMLDivElement;
    private container: Element;
    private renderer: PreviewRenderer;
    private renderTimeoutId: number | null = null;
    private renderDelayMs: number;

    private isShown: boolean;

    constructor(
        view: EditorView,
        container: Element,
        previewOptions: CommonmarkOptions["preview"]
    ) {
        this.container = container;
        this.isShown = previewOptions.enabled && previewOptions.shownByDefault;
        this.dom = document.createElement("div");
        this.dom.classList.add("s-prose", "py16", "js-md-preview");
        this.container.appendChild(this.dom);
        this.renderer = previewOptions?.renderer;

        if (!this.renderer) {
            throw "CommonmarkOptions.preview.renderer is required when CommonmarkOptions.preview.enabled is true";
        }

        this.renderDelayMs =
            previewOptions?.renderDelayMs ?? DEFAULT_RENDER_DELAY_MS;

        this.updatePreview(view.state.doc.textContent);
    }

    update(view: EditorView, prevState?: EditorState) {
        // get the current plugin state to check if we need to update our visibility
        const pluginState = PREVIEW_KEY.getState(view.state);
        const shouldBeShown = pluginState?.isShown || false;

        // if the doc/view hasn't changed, there's no work to do
        if (
            !docNodeChanged(prevState, view.state) &&
            this.isShown === shouldBeShown
        ) {
            return;
        }

        this.isShown = shouldBeShown;

        // if there is a render timeout already, clear it (essentially resetting the timeout)
        if (this.renderTimeoutId) {
            window.clearTimeout(this.renderTimeoutId);
            this.renderTimeoutId = null;
        }

        const text = view.state.doc.textContent;

        if (this.isShown && this.renderDelayMs) {
            // only render the preview after a delay
            // this is to prevent too many renders while the user is typing
            this.renderTimeoutId = window.setTimeout(() => {
                this.updatePreview(text);
                this.renderTimeoutId = null;
            }, this.renderDelayMs);
        } else {
            // if there is no delay, just render
            // there's typically no harm in setting a timeout with 0ms delay,
            // but running immediately without deferring execution is easier to unit test
            this.updatePreview(text);
        }
    }

    destroy() {
        this.dom.remove();
    }

    /** Renders the preview using the passed markdown text */
    private updatePreview(text: string) {
        this.container.innerHTML = "";

        // if showing the preview, fire off the renderer async
        if (this.isShown) {
            this.container.appendChild(this.dom);

            void this.renderer?.(text, this.dom).catch((e) =>
                error(
                    "PreviewView.updatePreview",
                    `Uncaught exception in preview renderer`,
                    e
                )
            );
        }
    }
}

/** PluginKey for managing the plugin created in @see createPreviewPlugin */
class PreviewPluginKey extends StatefulPluginKey<PreviewPluginState> {
    constructor() {
        super("preview");
    }

    setPreviewVisibility(view: EditorView, isShown: boolean) {
        const tr = this.setMeta(view.state.tr, { isShown });
        view.dispatch(tr);
    }

    previewIsVisible(view: EditorView): boolean {
        const pluginState = this.getState(view.state);
        return pluginState?.isShown ?? false;
    }
}

/**
 * Returns true if the markdown preview is currently visible
 * @param view The current editor view
 */
export function previewIsVisible(view: EditorView) {
    return PREVIEW_KEY.previewIsVisible(view);
}

/**
 * Toggles the preview on/off based on the passed parameters
 * @param view The current editor view
 * @param isShown Whether the preview should be visible
 */
export function setPreviewVisibility(view: EditorView, isShown: boolean) {
    PREVIEW_KEY.setPreviewVisibility(view, isShown);
}

/** Singleton instance of @see PreviewPluginKey */
const PREVIEW_KEY = new PreviewPluginKey();

/**
 * Plugin that renders the editor's markdown content directly and displays it in a preview element
 * @param previewOptions The preview options passed to the commonmark editor
 */
export function createPreviewPlugin(
    previewOptions: CommonmarkOptions["preview"]
): Plugin {
    if (!previewOptions?.enabled) {
        return new Plugin({});
    }

    return new StatefulPlugin<PreviewPluginState>({
        key: PREVIEW_KEY,
        state: {
            init: () => ({
                isShown: previewOptions.shownByDefault,
            }),
            apply(tr, value) {
                const meta = this.getMeta(tr);

                return {
                    isShown: meta?.isShown ?? value.isShown,
                };
            },
        },
        view(editorView) {
            const containerFn =
                previewOptions?.parentContainer ||
                function (v) {
                    return v.dom.parentElement;
                };

            const container = containerFn(editorView);

            if (container.contains(editorView.dom)) {
                throw "Preview parentContainer must not contain the editor view";
            }

            const previewView = new PreviewView(
                editorView,
                container,
                previewOptions
            );

            return previewView;
        },
    });
}
