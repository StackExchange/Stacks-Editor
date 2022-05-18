import { Plugin } from "prosemirror-state";

/** Plugin that selects only the current node on triple click */
export function tripleClickHandler(): Plugin {
    return new Plugin<boolean>({
        props: {
            handleDOMEvents: {
                mousedown(view, event) {
                    const {
                        selection: { $from, $to },
                    } = view.state;

                    return $from.sameParent($to) && event.detail === 3;
                },
            },
        },
    });
}
