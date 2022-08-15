import MarkdownIt from "markdown-it";
import { EditorState, Plugin, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { log } from "../../shared/logger";
import { createDefaultMarkdownItInstance } from "../../shared/markdown-parser";
import {
    StatefulPlugin,
    StatefulPluginKey,
} from "../../shared/prosemirror-plugins/plugin-extensions";
import { docNodeChanged } from "../../shared/utils";
import { CommonmarkParserFeatures } from "../../shared/view";
import type { CommonmarkOptions } from "../editor";

/** TODO DOCUMENT */
interface PreviewPluginState {
    isShown: boolean;
}

/**
 * The amount of time to delay rendering since the last render;
 * Setting to a high value will result in less frequent renders as users type
 */
const DEFAULT_RENDER_DELAY_MS = 100;

class PreviewView implements PluginView {
    dom: HTMLDivElement;
    private renderer: MarkdownIt;
    private renderTimeoutId: number | null = null;
    private renderDelayMs: number;

    private isShown = false;

    constructor(
        view: EditorView,
        parserFeatures: CommonmarkParserFeatures,
        previewOptions: CommonmarkOptions["preview"]
    ) {
        this.dom = document.createElement("div");
        this.dom.classList.add("s-prose", "js-md-preview");
        // TODO pass down the ExternalPluginProvider as well
        this.renderer =
            previewOptions?.renderer ||
            createDefaultMarkdownItInstance({
                ...parserFeatures,
                // TODO until we handle proper html sanitizing in the renderer,
                // we need to disable html entirely...
                html: false,
            });

        this.renderDelayMs =
            previewOptions?.renderDelayMs || DEFAULT_RENDER_DELAY_MS;

        this.renderPreview(view.state.doc.textContent);
    }

    update(view: EditorView, prevState?: EditorState) {
        // get the current plugin state to check if we need to update our visibility
        const pluginState = PREVIEW_KEY.getState(view.state);
        const shouldBeShown = pluginState?.isShown;

        // if the doc/view hasn't changed, there's no work to do
        if (
            !docNodeChanged(prevState, view.state) ||
            (!this.isShown && shouldBeShown)
        ) {
            return;
        }
        this.isShown = shouldBeShown;

        log(`preview update shouldBeShown ${String(shouldBeShown)}`);

        // if there is a render timeout already, clear it (essentially resetting the timeout)
        if (this.renderTimeoutId) {
            window.clearTimeout(this.renderTimeoutId);
        }

        const text = view.state.doc.textContent;

        if (this.renderDelayMs) {
            // only render the preview after a delay
            // this is to prevent too many renders while the user is typing
            this.renderTimeoutId = window.setTimeout(() => {
                this.renderPreview(text);
                this.renderTimeoutId = null;
            }, this.renderDelayMs);
        } else {
            // if there is no delay, just render
            // there's typically no harm in setting a timeout with 0ms delay,
            // but running immediately without deferring execution is easier to unit test
            this.renderPreview(text);
        }
    }

    destroy() {
        this.dom.remove();
    }

    /** Renders the preview using the passed markdown text */
    private renderPreview(text: string) {
        log("PreviewView.update", "Updated preview");
        // NOTE: This assumes that the renderer is properly sanitizing html;
        // this is specified in the option docs @see CommonmarkOptions["preview"]
        // eslint-disable-next-line no-unsanitized/property
        this.dom.innerHTML = this.renderer.render(text);
    }
}

class PreviewPluginKey extends StatefulPluginKey<PreviewPluginState> {
    constructor() {
        super("preview");
    }

    togglePreviewVisibility(view: EditorView, isShown: boolean) {
        const tr = this.setMeta(view.state.tr, { isShown });
        log(`toggle preview, isShown: ${String(isShown)}`);
        view.dispatch(tr);
    }

    previewIsVisible(view: EditorView): boolean {
        const pluginState = this.getState(view.state);
        return pluginState?.isShown ?? false;
    }
}

export function previewIsVisible(view: EditorView) {
    return PREVIEW_KEY.previewIsVisible(view);
}

export function togglePreviewVisibility(view: EditorView, isShown: boolean) {
    PREVIEW_KEY.togglePreviewVisibility(view, isShown);
}

const PREVIEW_KEY = new PreviewPluginKey();

/**
 * Plugin that renders the editor's markdown content directly and displays it in a preview element
 * @param previewOptions The preview options passed to the commonmark editor
 * @param parserFeatures The features to enable/disable on the commonmark parser
 */
export function createPreviewPlugin(
    previewOptions: CommonmarkOptions["preview"],
    parserFeatures: CommonmarkParserFeatures
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
                    isShown: meta?.isShown || value.isShown,
                };
            },
        },
        view(editorView) {
            const previewView = new PreviewView(
                editorView,
                parserFeatures,
                previewOptions
            );

            const containerFn =
                previewOptions?.parentContainer ||
                function (v) {
                    return v.dom.parentNode;
                };

            const container = containerFn(editorView);

            if (!container.contains(editorView.dom)) {
                if (PREVIEW_KEY.previewIsVisible(editorView)) {
                    container.insertBefore(
                        previewView.dom,
                        container.firstChild
                    );
                }
            } else {
                throw "Preview parentContainer must not contain the editor view";
            }

            return previewView;
        },
    });
}
