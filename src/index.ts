export type { EditorPlugin, EditorPluginSpec } from "./shared/editor-plugin";
export type { StacksEditorOptions } from "./stacks-editor/editor";
export type { MenuCommand, MenuBlock } from "./shared/menu";

export { EditorType } from "./shared/view";
export { ExternalPluginProvider } from "./shared/editor-plugin";
export {
    MarkdownSerializerNodes,
    MarkdownSerializerMarks,
} from "./shared/markdown-serializer";
export { StacksEditor } from "./stacks-editor/editor";
export { RichTextEditor } from "./rich-text/editor";
export { CommonmarkEditor } from "./commonmark/editor";

export * as Utils from "./shared/utils";
export { registerLocalizationStrings } from "./shared/localization";
export {
    insertParagraphIfAtDocEnd,
    safeSetSelection,
} from "./rich-text/commands/helpers";
export {
    makeMenuButton,
    makeMenuDropdown,
    makeMenuLinkEntry,
    addIf,
    createMenuEntries,
} from "./shared/menu";
export { log, error } from "./shared/logger";
export { richTextSchemaSpec } from "./rich-text/schema";
