import {
    EditorState,
    Plugin,
    PluginView,
    Transaction,
} from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { docChanged, generateRandomId } from "./utils";

/** NoOp to use in place of missing commands */
const commandNoOp = () => false;

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

/**
 * Describes a menu entry where command is the command to run when invoked and dom is the visual button itself
 * @public
 */
export interface MenuCommandEntry {
    active?: (state: EditorState) => boolean;
    visible?: (state: EditorState) => boolean;
    command: MenuCommand;
    dom: HTMLElement;
    key: string;

    // if this menu entry is a dropdown menu, it will have child items containing the actual commands
    children?: MenuCommandEntry[];
}

/**
 * Describes a visual "block"/grouping of menu items
 * @internal
 */
export interface MenuBlock<TEntry = MenuCommandEntry> {
    /**
     * The key that describes this block.
     * Blocks added by all plugins are merged by key.
     */
    name?: string;

    /** The priority of the block - lower values get placed first visually */
    priority?: number;

    /** The menu entries for this block */
    entries: TEntry[];

    /** Whether the block should be shown or not */
    visible?: MenuCommandEntry["visible"];

    /** The classes to add to the block container */
    classes?: string[];
}

class MenuView implements PluginView {
    dom: HTMLDivElement;
    protected blocks: (MenuBlock & { dom: HTMLElement })[];
    protected view: EditorView;
    protected readonly: boolean;

    static disabledClass = "is-disabled";
    static activeClass = "is-selected";
    static invisibleClass = "d-none";

    constructor(blocks: MenuBlock[], view: EditorView) {
        // sort the blocks by their priority; lower priority first
        this.blocks = blocks.sort(
            (a, b) => a.priority - b.priority
        ) as MenuView["blocks"];
        this.view = view;

        this.dom = document.createElement("div");
        this.dom.className = "d-flex g16 fl-grow1 ai-center js-editor-menu";

        for (const block of this.blocks) {
            const blockDom = this.makeBlockContainer(block);
            for (const entry of block.entries) {
                blockDom.appendChild(entry.dom);
            }

            this.dom.appendChild(blockDom);
            block.dom = blockDom;
        }

        this.update(view, null);

        // turn all menu commands into a flat list so we can easily look them up later
        const menuCommands = ([] as MenuCommandEntry[]).concat(
            ...this.blocks
                .map((item) => item.entries)
                .reduce((a, b) => a.concat(b), [])
                .map((item) => {
                    if (item.children) {
                        // include the drop-down parent AND all of its children if there are child MenuCommandEntries
                        return [item, ...item.children];
                    }
                    return item;
                })
        );

        // NOTE: make sure your plugin/menu container calls `e.preventDefault()` on `mousedown` events
        // so the editor doesn't blur on click! StacksEditor automatically handles this for us in a typical use-case
        this.dom.addEventListener("click", (e) => {
            // find the closest button parent of the clicked element
            const target = (<HTMLElement>e.target).closest(".js-editor-btn");

            if (!target) {
                return;
            }

            // if the button is "disabled", return early
            if (target.classList.contains(MenuView.disabledClass)) {
                return;
            }

            const key = (target as HTMLElement).dataset.key;

            e.preventDefault();
            view.focus();

            const found = menuCommands.find((c) => c.key === key);
            if (found) {
                found.command(view.state, view.dispatch.bind(view), view);
            }
        });

        this.readonly = !view.editable;
    }

    update(view: EditorView, prevState: EditorState) {
        // if the doc/view hasn't changed, there's no work to do
        if (
            !docChanged(prevState, view.state) &&
            this.readonly !== view.editable
        ) {
            return;
        }

        this.readonly = !view.editable;

        // disable *all* clicks if the menu is readonly
        this.dom.classList.toggle("pe-none", this.readonly);

        const viewIsReadonly = this.readonly;
        const isFocused = this.view.hasFocus();

        // check all blocks and their commands for visibility
        for (const block of this.blocks) {
            const visible = block.visible
                ? block.visible(this.view.state)
                : true;

            block.dom.classList.toggle(MenuView.invisibleClass, !visible);

            // don't bother checking commands if the block is not visible
            if (!visible) {
                continue;
            }

            // check each entry and update the dom to match the current state
            for (const entry of block.entries) {
                this.checkAndUpdateMenuCommandState(
                    entry,
                    viewIsReadonly,
                    isFocused
                );
            }
        }
    }

    destroy() {
        this.dom.remove();
    }

    /**
     * Checks if the given menu command is visible/active for the current state and updates its dom to match
     * @param entry The menu command entry to check
     * @param isReadonly Whether the editor is readonly
     * @param isFocused Whether the editor currently has focus
     */
    private checkAndUpdateMenuCommandState(
        entry: MenuCommandEntry,
        isReadonly: boolean,
        isFocused: boolean
    ): void {
        let dom = entry.dom;

        // make sure we really got the button itself, not a wrapper
        if (!dom.classList.contains("js-editor-btn")) {
            const button: HTMLElement = dom.querySelector(".js-editor-btn");
            dom = button ?? dom;
        }

        const visible = entry.visible ? entry.visible(this.view.state) : true;

        const active =
            isFocused && entry.active ? entry.active(this.view.state) : false;

        const enabled =
            !isReadonly && entry.command(this.view.state, undefined, this.view);

        dom.classList.remove(MenuView.disabledClass);
        dom.classList.remove(MenuView.activeClass);
        dom.classList.remove(MenuView.invisibleClass);

        dom.dataset.key = entry.key;

        // class priority is active > disabled > default
        if (!visible) {
            dom.classList.add(MenuView.invisibleClass);
        } else if (active) {
            dom.classList.add(MenuView.activeClass);
        } else if (!enabled) {
            dom.classList.add(MenuView.disabledClass);
        }

        // if this is a dropdown, check all of its children as well
        if (entry.children?.length) {
            for (const child of entry.children) {
                this.checkAndUpdateMenuCommandState(
                    child,
                    isReadonly,
                    isFocused
                );
            }
        }
    }

    /** Creates the element that a block's child entries' doms are placed into */
    private makeBlockContainer(block: MenuBlock) {
        const dom = document.createElement("div");
        dom.className = `s-editor-menu-block d-flex g2 ${
            block.classes?.join(" ") ?? ""
        }`;

        return dom;
    }
}

/**
 * Simple wrapper function to ensure that conditional menu item adds are consistent
 * @param item The item to add if flag is truthy
 * @param flag Whether to add the item
 * @internal
 */
export function addIf(item: MenuCommandEntry, flag: boolean): MenuCommandEntry {
    return flag ? item : null;
}

/**
 * Creates a menu plugin with the passed in entries
 * @param blocks The entries to use on the generated menu
 * @param containerFn A function that returns the container element for the menu
 * @internal
 */
export function createMenuPlugin(
    blocks: MenuBlock[],
    containerFn: (view: EditorView) => Node
): Plugin {
    // remove all empty / falsy items
    const validItems = blocks.filter((i) => !!i);

    return new Plugin({
        view(editorView) {
            const menuView = new MenuView(validItems, editorView);
            containerFn =
                containerFn ||
                function (v) {
                    return v.dom.parentNode;
                };

            const container = containerFn(editorView);

            // if the container is the same as the one that has the editor
            // insert the menu before it
            if (container.contains(editorView.dom)) {
                container.insertBefore(menuView.dom, editorView.dom);
            } else {
                container.insertBefore(menuView.dom, container.firstChild);
            }

            return menuView;
        },
    });
}

/**
 * Helper function to create consistent menu entry doms
 * @param iconName The html of the svg to use as the icon
 * @param title The text to place in the button's title attribute
 * @param key A unique identifier used for identifying the command to be executed on click
 * @param cssClasses extra CSS classes to be applied to this menu icon (optional)
 * @internal
 */
export function makeMenuButton(
    iconName: string,
    title: string,
    key: string,
    cssClasses?: string[]
): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = `s-editor-btn js-editor-btn js-${key}`;

    if (cssClasses) {
        button.classList.add(...cssClasses);
    }

    button.title = title;
    button.setAttribute("aria-label", title);
    button.dataset.controller = "s-tooltip";
    button.dataset.sTooltipPlacement = "top";
    button.dataset.key = key;
    button.type = "button";

    // create the svg icon-bg element
    const icon = document.createElement("span");
    icon.className = "icon-bg icon" + iconName;

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
    ...children: MenuCommandEntry[]
): MenuCommandEntry {
    const randomId = generateRandomId();
    const popoverId = `${key}-popover-${randomId}`;
    const buttonId = `${key}-btn-${randomId}`;

    const button = makeMenuButton(svg, title, key);
    button.classList.add("s-btn", "s-btn__dropdown");
    button.setAttribute("aria-controls", popoverId);
    button.setAttribute("data-action", "s-popover#toggle");
    button.setAttribute("data-controller", "s-tooltip");
    button.id = buttonId;
    button.dataset.key = key;

    const popover = document.createElement("div");
    popover.className = "s-popover wmn-initial w-auto px0 pt0 pb8";
    popover.id = popoverId;
    popover.setAttribute("role", "menu");

    const arrow = document.createElement("div");
    arrow.className = "s-popover--arrow";

    popover.appendChild(arrow);

    const content = document.createElement("div");
    content.className = "d-flex fd-column";

    content.append(...children.map((c) => c.dom));
    popover.appendChild(content);

    const wrapper = document.createElement("div");
    wrapper.dataset.controller = "s-popover";
    wrapper.setAttribute("data-s-popover-toggle-class", "is-selected");
    wrapper.setAttribute("data-s-popover-placement", "bottom");
    wrapper.setAttribute("data-s-popover-reference-selector", `#${buttonId}`);
    wrapper.appendChild(button);
    wrapper.appendChild(popover);

    return {
        key: key,
        dom: wrapper,
        children: children,
        command: () => true,
        visible: visible,
        active: active,
    };
}

/**
 * Creates a dropdown menu item that can be embedded in a dropdown menu's popover
 * @param title The text to be displayed for this item
 * @param command The command to be executed when this item is clicked
 * @param key A unique identifier used for identifying the command to be executed on click
 * @param active A function to determine whether this item should be rendered as "active"
 * @param cssClasses Additional css classes to be applied to this dropdown item
 * @internal
 */
export function dropdownItem(
    title: string,
    command: MenuCommand,
    key: string,
    active?: (state: EditorState) => boolean,
    cssClasses?: string[]
): MenuCommandEntry {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.key = key;
    button.textContent = title;
    button.dataset.action = "s-popover#hide";
    button.className = `s-editor-btn s-editor-btn__dropdown-item js-editor-btn`;

    if (cssClasses) {
        button.classList.add(...cssClasses);
    }

    return {
        key: key,
        command: command,
        dom: button,
        active: active,
    };
}

/**
 * Creates a section with a heading usable for dropdown menus. This is just a visual element with no
 * interaction and no action being triggered on click
 * @param title The text to be displayed for this item
 * @param key A unique identifier used for identifying the command to be executed on click
 * @internal
 */
export function dropdownSection(title: string, key: string): MenuCommandEntry {
    const section = document.createElement("span");
    section.className = `flex--item ta-left fs-fine tt-uppercase mx12 mb6 mt12 fc-black-400`;
    section.dataset.key = key;
    section.textContent = title;

    return {
        key: key,
        command: () => true,
        visible: () => true,
        active: () => false,
        dom: section,
    };
}

/**
 * Creates a link entry that opens a _blank to href when clicked
 * @param iconName The html of the svg to use as the icon
 * @param title The text to place in the link's title attribute
 * @param href The href to open when clicked
 * @internal
 */
export function makeMenuLinkEntry(
    iconName: string,
    title: string,
    href: string
): MenuCommandEntry {
    const dom = document.createElement("a");
    dom.className = `s-editor-btn js-editor-btn flex--item`;
    dom.href = href;
    dom.target = "_blank";
    dom.title = title;
    dom.setAttribute("aria-label", title);
    dom.dataset.controller = "s-tooltip";
    dom.dataset.sTooltipPlacement = "top";

    // create the svg icon-bg element
    const icon = document.createElement("span");
    icon.className = "icon-bg icon" + iconName;

    dom.append(icon);

    return {
        key: title,
        command: (_, dispatch) => {
            if (dispatch) {
                window.open(dom.href, dom.target);
            }

            return !!href;
        },
        active: commandNoOp,
        dom: dom,
    };
}
