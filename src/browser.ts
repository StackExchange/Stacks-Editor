/* eslint-disable @typescript-eslint/ban-ts-comment */
// NOTE: Explicitly import as type only so the entire bundle isn't pulled in
import type { StacksEditorOptions, StacksEditor } from "./stacks-editor/editor";

import "./styles/index.less";

/**
 * Asyncronously lazy loads the editor code bundle and initializes a new editor instance
 * @param target The target element to place the editor into
 * @param content The markdown string to initialize the editor with
 * @param options Options to pass to the newly created editor
 */
export function stacksEditorAsync(
    target: HTMLElement,
    content: string,
    options: StacksEditorOptions = {}
): Promise<StacksEditor> {
    // TODO can we use `webpack config > optimization.portableRecords: true` instead?
    // allow consumers to set their own resource path for the imports to point to
    // this allows UMD consumers to set the path where the script files are stored / to be loaded from
    // @ts-ignore
    if (window.stacksEditorResourcePath) {
        // sets the "magic" __webpack_public_path__ free variable so webpack will honor the import path for all dynamic imports
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        __webpack_public_path__ = window.stacksEditorResourcePath;
    }

    return import(/* webpackChunkName: "editor" */ "./index").then((editor) => {
        return new editor.StacksEditor(target, content, options);
    });
}
