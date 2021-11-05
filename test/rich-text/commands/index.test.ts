import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { MenuCommand } from "../../../src/shared/menu";
import "../../matchers";

/**
 * Applies a command to the state and expects it to apply correctly
 */
export function runCommand(
    state: EditorState<Schema>,
    command: MenuCommand,
    expectSuccess = true
) {
    let newState = state;

    const isValid = command(state, (t) => {
        newState = state.apply(t);
    });

    expect(isValid).toBe(expectSuccess);
    return newState;
}
