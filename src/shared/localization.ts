import type { PartialDeep } from "./utils";

type Strings = {
    [key: string]:
        | string
        | ((params: Record<string, unknown>) => string)
        | Strings;
};

/** Curried helper method that wraps a i18n method for menu entries w/ shortcuts */
function shortcut(text: string): (args: { shortcut: string }) => string {
    return (args) => `${text} (${args.shortcut})`;
}

/** The default set of localizable strings */
export const defaultStrings = {
    commands: {
        blockquote: shortcut("Blockquote"),
        bold: shortcut("Bold"),
        code_block: shortcut("Code block"),
        emphasis: shortcut("Italic"),
        heading: {
            dropdown: shortcut("Heading"),
            entry: ({ level }: { level: number }) => `Heading ${level}`,
        },
        help: "Help",
        horizontal_rule: shortcut("Horizontal rule"),
        image: shortcut("Image"),
        inline_code: shortcut("Inline code"),
        link: shortcut("Link"),
        ordered_list: shortcut("Numbered list"),
        redo: shortcut("Redo"),
        strikethrough: "Strikethrough",
        table_edit: "Edit table",
        table_insert: shortcut("Table"),
        table_column: {
            insert_after: "Insert column after",
            insert_before: "Insert column before",
            remove: "Remove column",
        },
        table_row: {
            insert_after: "Insert row after",
            insert_before: "Insert row before",
            remove: "Remove row",
        },
        undo: shortcut("Undo"),
        unordered_list: shortcut("Bulleted list"),
    },
    link_editor: {
        cancel_button: "Cancel",
        href_label: "Link URL",
        save_button: "Save",
        text_label: "Link text",
        validation_error: "The entered URL is invalid.",
    },
    link_tooltip: {
        edit_button_title: "Edit link" as string,
        remove_button_title: "Remove link" as string,
    },
    menubar: {
        mode_toggle_label: "Markdown" as string,
        mode_toggle_title: "Toggle Markdown mode" as string,
    },
    nodes: {
        codeblock_lang_auto: ({ lang }: { lang: string }) => `${lang} (auto)`,
        spoiler_reveal_text: "Reveal spoiler" as string,
    },
    image_upload: {
        default_image_alt_text: "enter image description here" as string,
        external_url_validation_error: "The entered URL is invalid." as string,
        upload_error_file_too_big:
            "Your image is too large to upload (over 2 MiB)" as string,
        upload_error_generic:
            "Image upload failed. Please try again." as string,
        upload_error_unsupported_format:
            "Please select an image (jpeg, png, gif) to upload" as string,
        uploaded_image_preview_alt: "uploaded image preview" as string,
    },
} as const;

/** The set of strings that were overridden by registerLocalizationStrings */
let strings: PartialDeep<typeof defaultStrings> = defaultStrings;

/** Registers new localization strings; any strings that are left unregistered will fall back to the default value */
export function registerLocalizationStrings(
    newStrings: PartialDeep<typeof defaultStrings>
) {
    strings = newStrings;
}

/** Resolves a dot-separeated key against an object */
function resolve(obj: Strings, key: string) {
    return key.split(".").reduce((p, n) => p?.[n], obj);
}

/** Caches key lookups to their values so we're not continuously splitting */
const cache: Strings = {};

/**
 * Checks the localized strings for a given key and returns the value
 * @param key A dot-separated key to the localized string e.g. "menubar.mode_toggle_label"
 * @param params An object of parameters to pass to the localization function if it exists
 */
export function _t(key: string, params: Record<string, unknown> = {}): string {
    if (!(key in cache)) {
        cache[key] = resolve(strings, key) || resolve(defaultStrings, key);
    }

    const string = cache[key];

    if (!string) {
        throw `Missing translation for key: ${key}`;
    }

    if (typeof string === "string") {
        return string;
    } else if (typeof string === "function") {
        return string(params);
    }

    throw `Missing translation for key: ${key}`;
}
