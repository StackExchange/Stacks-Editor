import { Plugin } from "prosemirror-state";
import { log } from "../logger";

/**
 * Dealing with selections in prosemirror is not always trivial.
 * When you need an interactive glance into where your selection
 * is at and how it's being updated, you can register this plugin
 * with your editor instance and watch the current state's selection
 * in your browser's JavaScript console.
 */
export const selectionDebugger = new Plugin({
    state: {
        init() {
            return;
        },
        apply(tr) {
            log("Selection", tr.selection);
        },
    },
});
