import type { PartialDeep } from "./utils";

type Strings = {
    [key: string]:
        | string
        | ((params: Record<string, unknown>) => string)
        | Strings;
};

/** The default set of localizable strings */
export const defaultStrings = {
    link_tooltip: {
        apply_button_text: "Apply" as string,
        apply_button_title: "Apply new link" as string,
        edit_button_title: "Edit link" as string,
        remove_button_title: "Remove link" as string,
    },
    menubar: {
        mode_toggle_label: "Markdown" as string,
        mode_toggle_title: "Toggle Markdown mode" as string,
    },
    nodes: {
        codeblock_auto: "auto" as string,
        codeblock_lang_auto: ({ lang }: { lang: string }) => `${lang} (auto)`,
        spoiler_reveal_text: "Reveal spoiler" as string,
    },
    image_upload: {
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
