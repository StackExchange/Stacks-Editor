import {
    BaseOptions,
    EditorPlugin,
    EditorType,
    Editor,
} from "../builder/types";
import { defaultImageUploadHandler } from "../shared/prosemirror-plugins/image-upload";

// TODO we should pull these in from the plugins themselves
// so removing options "upstream" doesn't cause them to stick around here...
interface OtherEditorPluginOptions extends BaseOptions {
    imageUpload: {
        handler: (file: File) => Promise<string>;
    };

    linkPreviewProviders: [];
    codeblockOverrideLanguage: string;
}

const READONLY_CLASSES = ["s-input__readonly"];

export const stacksPlugin: EditorPlugin<OtherEditorPluginOptions> = {
    options: {
        defaultView: EditorType.RichText,
        targetClassList: [
            "ps-relative",
            "z-base",
            "s-textarea",
            "overflow-auto",
            "hmn2",
            "w100",
            "p0",
            "d-flex",
            "fd-column",
            "s-editor-resizable",
        ],
        classList: [
            "fl-grow1",
            "outline-none",
            "p12",
            "pt6",
            "w100",
            "s-prose",
            // in case this needs to be reference by outside code or e2e tests
            "js-editor",
            // added automatically, but let's be explicit for code clarity
            "ProseMirror",
        ],
        imageUpload: {
            handler: defaultImageUploadHandler,
        },
        linkPreviewProviders: [],
        codeblockOverrideLanguage: null,
    },

    events: {
        onEnable(view: Editor): void {
            view.editorTarget.classList.remove(...READONLY_CLASSES);
        },
        onDisable(view: Editor): void {
            view.editorTarget.classList.add(...READONLY_CLASSES);
        },
    },
};
