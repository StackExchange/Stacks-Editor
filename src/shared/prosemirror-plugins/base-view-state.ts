import { PluginKey, Plugin } from "prosemirror-state";
import { BaseView } from "../view";

interface BaseViewState {
    baseView: BaseView;
}

export const BASE_VIEW_KEY = new PluginKey<BaseViewState>();

/**
 * A pointer to the full `BaseView` that initialized this state, such that it can be referenced in downstream plugins
 **/
export const baseViewStatePlugin = (
    baseView: BaseView
): Plugin<BaseViewState> => {
    return new Plugin<BaseViewState>({
        key: BASE_VIEW_KEY,
        state: {
            init() {
                return {
                    baseView,
                };
            },
            apply(_, value) {
                //View switching does not maintain state, so we always want the initialized value
                return value;
            },
        },
    });
};
