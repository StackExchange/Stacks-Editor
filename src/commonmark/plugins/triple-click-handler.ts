import { Plugin } from "prosemirror-state";

/** Plugin that restores browser default triple-click handling behavior */
export const tripleClickHandler = new Plugin<boolean>({
    props: {
        handleDOMEvents: {
            mousedown(view, event) {
                const { $from, $to } = view.state.selection;
                // triple clicks only (detail is set to number of clicks for mousedown events)
                const isTripleClick = event.detail === 3;
                // only clicks where the selection doesn't span across nodes
                const notSpanningNodes = $from.sameParent($to);

                return isTripleClick && notSpanningNodes;
            },
        },
    },
});
