import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { escapeHTML } from "../utils";

/**
 * Callback function signature for all menu entries
 * @param view The editor view to act on
 * @param suppressDispatch True if the command should *not* be ran on the state; used to determine if the command is valid
 * @returns true if the entry is valid for the current state
 * @public
 */
export type MenuCommand = (
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view?: EditorView
) => boolean;

/** A more powerful command variant for {@link MenuItem} */
export interface MenuCommandExtended {
    /**
     * Whether the menu item should be highlighted as "active" or not.
     * Most commonly used to indicate that the selection contains a node/mark of the command's type
     */
    active?: (state: EditorState) => boolean;
    /** Whether the menu item should be visible or not */
    visible?: (state: EditorState) => boolean;
    /** The actual command this entry triggers */
    command: MenuCommand;
}

/** Describes the options available for displaying a standard menu item */
export type MenuItemDisplay = {
    /**
     * The name of the svg icon to use
     * NOTE: Added as a class to the element - this is likely to change in the near future
     */
    svg: string;
    /** The text to show in the entry's tooltip */
    label: string;
};

/**
 * Describes a single, basic menu item
 * @internal
 */
export interface BaseMenuItem {
    /** The command to execute when in rich-text mode */
    richText: MenuCommandExtended | MenuCommand;
    /** The command to execute when in commonmark mode */
    commonmark: MenuCommandExtended | MenuCommand;
    /** The keyboard shortcut to attach this command to TODO */
    //keybind?: string;

    /**
     * The element to display in the menu or options to pass to the default item renderer;
     * if this item has children, this value must be a {@link MenuItemDisplay}
     */
    display: MenuItemDisplay | HTMLElement;

    /** The unique id used to reference this entry */
    key: string;
}

/**
 * Describes a single menu item with a dropdown menu
 * @internal
 */
export interface DropdownMenuItem extends BaseMenuItem {
    /** {@inheritDoc BaseMenuItem.display } */
    display: MenuItemDisplay;

    /**
     * The child entries for this entry.
     * Setting this will create a dropdown, ignoring the richText and commonmark command entries
     * */
    children?: BaseMenuItem[];
}

/**
 * Describes a single entry to add to the menu
 * @public
 */
export type MenuItem = BaseMenuItem | DropdownMenuItem;

/**
 * Describes a visual "block"/grouping of menu items
 * @public
 */
export interface MenuBlock {
    /**
     * The key that describes this block.
     * Blocks added by all plugins are merged by key.
     */
    name?: string;

    /** The priority of the block - lower values get placed first visually */
    priority?: number;

    /** The menu entries for this block */
    entries: MenuItem[];

    /** Whether the block should be shown or not */
    visible?: MenuCommandExtended["visible"];

    /** The classes to add to the block container */
    classes?: string[];
}

/**
 * Creates a link entry that opens a _blank to href when clicked
 * @param iconName The html of the svg to use as the icon
 * @param title The text to place in the link's title attribute
 * @param href The href to open when clicked
 * @param key A unique identifier used for this link
 * @internal
 */
export function makeMenuLinkEntry(
    iconName: string,
    title: string,
    href: string,
    key: string
): MenuItem {
    const dom = document.createElement("a");
    dom.className = `s-editor-btn s-btn s-btn__muted flex--item js-editor-btn js-${key}`;
    dom.href = href;
    dom.target = "_blank";
    dom.title = title;
    dom.setAttribute("aria-label", title);
    dom.dataset.controller = "s-tooltip";
    dom.dataset.sTooltipPlacement = "bottom";

    // create the svg svg-icon-bg element
    const icon = document.createElement("span");
    icon.className = "svg-icon-bg icon" + iconName;

    dom.append(icon);

    const command: MenuCommandExtended = {
        command: (_, dispatch) => {
            if (dispatch) {
                window.open(dom.href, dom.target);
            }

            return !!href;
        },
        active: () => false,
    };

    return {
        key: key,
        richText: command,
        commonmark: command,
        display: dom,
    };
}

/**
 * Creates a section with a heading usable for dropdown menus. This is just a visual element with no
 * interaction and no action being triggered on click
 * @param label The text to be displayed for this item
 * @param key A unique identifier used for identifying the command to be executed on click
 * @internal
 */
export function makeDropdownSection(label: string, key: string): MenuItem {
    const section = document.createElement("span");
    section.className = `flex--item ta-left fs-fine tt-uppercase mx12 mb6 mt12 fc-black-400`;
    section.dataset.key = key;
    section.textContent = label;

    const command = {
        command: () => true,
        visible: () => true,
        active: () => false,
    };

    return {
        key: key,
        richText: command,
        commonmark: command,
        display: section,
    };
}

/**
 * Creates a dropdown menu item that can be embedded in a dropdown menu's popover
 * @param title The text to be displayed for this item
 * @param command The command to be executed when this item is clicked
 * @param key A unique identifier used for identifying the command to be executed on click
 * @param cssClasses Additional css classes to be applied to this dropdown item
 * @internal
 */
export function makeDropdownItem(
    title: string,
    command: Pick<MenuItem, "richText" | "commonmark">,
    key: string,
    cssClasses?: string[]
): MenuItem {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.key = key;
    button.textContent = title;
    button.setAttribute("role", "menuitem");
    button.className = `s-block-link s-editor--dropdown-item js-editor-btn`;

    if (cssClasses) {
        button.classList.add(...cssClasses);
    }

    return {
        key: key,
        ...command,
        display: button,
    };
}

/**
 * Simple wrapper function to ensure that conditional menu item adds are consistent
 * @param item The item to add if flag is truthy
 * @param flag Whether to add the item
 * @internal
 */
export function addIf(item: MenuItem, flag: boolean): MenuItem {
    return flag ? item : null;
}

/**
 * Helper function to create consistent menu entry doms
 * @param iconName The html of the svg to use as the icon
 * @param content Either a string containing the text to place in the button's title attribute
 * or an object containing the title and helpText to be used in the hover tooltip
 * @param key A unique identifier used for identifying the command to be executed on click
 * @param cssClasses extra CSS classes to be applied to this menu icon (optional)
 * @internal
 */
export function makeMenuButton(
    iconName: string,
    content: string | { title: string; description: string },
    key: string,
    cssClasses?: string[]
): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = `s-editor-btn s-btn js-editor-btn js-${key}`;

    if (cssClasses) {
        button.classList.add(...cssClasses);
    }

    let title = content as string;
    let description = null;

    if (typeof content !== "string") {
        title = content.title;
        description = content.description;
    }

    if (description) {
        button.dataset.sTooltipHtmlTitle = escapeHTML`<p class="mb4">${title}</p><p class="fs-caption fc-light m0">${description}</p>`;
    }

    button.title = title;
    button.setAttribute("aria-label", title);
    button.dataset.controller = "s-tooltip";
    button.dataset.sTooltipPlacement = "bottom";
    button.dataset.key = key;
    button.type = "button";

    // create the svg svg-icon-bg element
    const icon = document.createElement("span");
    icon.className = "svg-icon-bg icon" + iconName;

    button.append(icon);

    return button;
}

/**
 * Create a dropdown menu item that contains all children in its popover
 * @param svg The html of the svg to use as the dropdown icon
 * @param title The text to place in the dropdown button's title attribute
 * @param key A unique identifier used for this dropdown menu
 * @param visible A function that determines wether the dropdown should be visible or hidden
 * @param active A function to determine if the dropdown should be highlighted as active
 * @param children The child MenuCommandEntry items to be placed in the dropdown menu
 * @internal
 */
export function makeMenuDropdown(
    svg: string,
    title: string,
    key: string,
    visible?: (state: EditorState) => boolean,
    active?: (state: EditorState) => boolean,
    ...children: MenuItem[]
): DropdownMenuItem {
    const command = {
        command: () => true,
        visible,
        active,
    };

    return {
        key: key,
        display: {
            svg,
            label: title,
        },
        children: children,
        richText: command,
        commonmark: command,
    };
}
