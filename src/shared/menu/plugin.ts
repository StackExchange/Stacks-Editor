import {
    EditorState,
    Plugin,
    PluginView,
    Transaction,
} from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { docChanged, generateRandomId } from "../utils";
import { EditorType } from "../view";
import {
    MenuBlock,
    MenuCommandExtended,
    MenuItem,
    MenuItemDisplay,
    MenuCommand,
    makeMenuButton,
} from "./helpers";

/** NoOp to use in place of missing commands */
const commandNoOp = () => false;

/** Describes a menu block that has all of its properties standardized to consistent types */
interface StandardizedMenuBlock extends Omit<MenuBlock, "entries"> {
    dom: HTMLElement;
    entries: StandardizedMenuItem[];
}

/** Describes a menu item that has all of its properties standardized to consistent types */
interface StandardizedMenuItem {
    richText: MenuCommandExtended;
    commonmark: MenuCommandExtended;
    display: HTMLElement;
    key: string;
    children?: StandardizedMenuItem[] | null;
}

/**
 * PluginView that creates, tracks and changes the state of all menu items
 * @internal
 */
export class MenuView implements PluginView {
    dom: HTMLDivElement;
    private blocks: StandardizedMenuBlock[];
    private view: EditorView;
    private readonly: boolean;
    private editorType: EditorType;

    static disabledClass = "is-disabled";
    static activeClass = "is-selected";
    static invisibleClass = "d-none";

    constructor(blocks: MenuBlock[], view: EditorView, editorType: EditorType) {
        this.view = view;
        this.editorType = editorType;

        this.dom = document.createElement("div");
        this.dom.className = "d-flex g16 fl-grow1 ai-center js-editor-menu";

        // sort the blocks by their priority; lower priority first
        this.blocks = blocks
            .filter((b) => !!b)
            .sort((a, b) => a.priority - b.priority)
            .map((b) => {
                const entries = this.standardizeMenuItems(b.entries);

                const blockDom = this.makeBlockContainer(b);
                for (const entry of entries) {
                    blockDom.appendChild(entry.display);
                }

                this.dom.appendChild(blockDom);

                return {
                    ...b,
                    entries,
                    dom: blockDom,
                };
            });

        this.update(view, null);

        // turn all menu commands into a flat list so we can easily look them up later
        const menuCommands = [].concat(
            ...this.blocks
                .map((item) => item.entries)
                .reduce((a, b) => a.concat(b), [])
                .filter((e) => !!e)
                .map((item) => {
                    if ("children" in item && item.children?.length) {
                        // include the drop-down parent AND all of its children if there are child MenuCommandEntries
                        return [item, ...item.children];
                    }
                    return item;
                })
        ) as StandardizedMenuItem[];

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
            const isMouseEvent = e.detail > 0; // See https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail

            // Move focus to the editor exclusively for mouse clicks
            // For keyboard events, we keep the focus on the menubar
            if (isMouseEvent) {
                // When the click is from a menuitem, hide the popover
                if (target.getAttribute("role") === "menuitem") {
                    const menuButton = (<HTMLElement>e.target).closest(
                        '[data-controller="s-popover"]'
                    );
                    hidePopover(menuButton);
                }

                // leave the menubar and focus on the editor
                view.focus();
            }
            // Conditional added to only focus view on mouse events, so keyboard navigation remains intact
            // See https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail
            if (e.detail > 0) {
                // Hide the menu popover if it's visible
                const menu = (<HTMLElement>e.target).closest(".s-popover");
                if (target.getAttribute("role") === "menuitem" && menu) {
                    menu?.classList.remove("is-visible");
                    target.setAttribute("aria-expanded", "false");
                }
                view.focus();
            }

            const found = menuCommands.find((c) => c.key === key);
            const foundCommand = this.command(found);
            if (foundCommand.command) {
                foundCommand.command(
                    view.state,
                    view.dispatch.bind(view) as (tr: Transaction) => void,
                    view
                );
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

            // if the block doesn't have a visibility function, don't mess with the classes at all
            if (block.visible) {
                block.dom.classList.toggle(MenuView.invisibleClass, !visible);
            }

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
        entry: StandardizedMenuItem,
        isReadonly: boolean,
        isFocused: boolean
    ): void {
        let dom = entry.display;

        // make sure we really got the button itself, not a wrapper
        if (!dom.classList.contains("js-editor-btn")) {
            const button: HTMLElement = dom.querySelector(".js-editor-btn");
            dom = button ?? dom;
        }

        const command = this.command(entry);

        const visible = command.visible
            ? command.visible(this.view.state)
            : true;

        const active =
            isFocused && command.active
                ? command.active(this.view.state)
                : false;

        const enabled =
            !isReadonly &&
            command.command(this.view.state, undefined, this.view);

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
        if ("children" in entry && entry.children?.length) {
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
        } js-block-${block.name}`;

        return dom;
    }

    /**
     * Simplifies all menu items, standardizing their properties for consistent use
     * @param entries the menu items to simplify
     */
    private standardizeMenuItems(entries: MenuItem[]): StandardizedMenuItem[] {
        const ret: StandardizedMenuItem[] = [];

        if (!entries?.length) {
            return [];
        }

        for (const entry of entries) {
            // TODO WRITE TEST
            if (!entry?.key) {
                continue;
            }

            let sanitizedEntry: StandardizedMenuItem = {
                ...entry,
                // check for an extended vs simple command
                commonmark: this.expandCommand(entry.commonmark),
                richText: this.expandCommand(entry.richText),
                display: null,
                children: null,
            };

            if ("children" in entry && entry.children?.length) {
                sanitizedEntry.children = this.standardizeMenuItems(
                    entry.children
                );
                sanitizedEntry = this.buildMenuDropdown(
                    sanitizedEntry,
                    entry.display
                );
            } else if ("svg" in entry.display) {
                sanitizedEntry.display = makeMenuButton(
                    entry.display.svg,
                    entry.display.label,
                    sanitizedEntry.key,
                    []
                );
            } else {
                sanitizedEntry.display = entry.display;
            }

            ret.push(sanitizedEntry);
        }

        return ret;
    }

    /** Helper method to get the right command from an item for the current editor type */
    private command(entry: StandardizedMenuItem) {
        return this.editorType === EditorType.RichText
            ? entry?.richText
            : entry?.commonmark;
    }

    /** Builds a dropdown menu button with its dropdown */
    private buildMenuDropdown(
        entry: StandardizedMenuItem,
        display: MenuItemDisplay
    ): StandardizedMenuItem {
        const randomId = generateRandomId();
        const popoverId = `${entry.key}-popover-${randomId}`;
        const buttonId = `${entry.key}-btn-${randomId}`;

        const button = makeMenuButton(display.svg, display.label, entry.key);
        button.classList.add("s-btn", "s-btn__dropdown");
        button.setAttribute("aria-controls", popoverId);
        button.setAttribute("data-action", "s-popover#toggle");
        button.setAttribute("data-controller", "s-tooltip");
        button.setAttribute("role", "menu");
        button.id = buttonId;
        button.dataset.key = entry.key;

        const popover = document.createElement("div");
        popover.className = "s-popover wmn-initial w-auto px0 pt0 py8";
        popover.id = popoverId;
        popover.setAttribute("role", "menu");

        const arrow = document.createElement("div");
        arrow.className = "s-popover--arrow";
        arrow.setAttribute("aria-hidden", "true");

        popover.appendChild(arrow);

        const content = document.createElement("div");
        content.className = "d-flex fd-column";

        content.append(...entry.children.map((c) => c.display));
        popover.appendChild(content);

        const wrapper = document.createElement("div");
        wrapper.dataset.controller = "s-popover";
        wrapper.setAttribute("data-s-popover-toggle-class", "is-selected");
        wrapper.setAttribute("data-s-popover-placement", "bottom");
        wrapper.setAttribute(
            "data-s-popover-reference-selector",
            `#${buttonId}`
        );
        wrapper.appendChild(button);
        wrapper.appendChild(popover);

        const command = {
            ...this.command(entry),
        };

        return {
            key: entry.key,
            display: wrapper,
            children: entry.children,
            richText: command,
            commonmark: command,
        };
    }

    /** Helper method to convert a MenuItem's command to a standard type */
    private expandCommand(
        command: MenuCommandExtended | MenuCommand
    ): MenuCommandExtended {
        if (!command) {
            return {
                command: commandNoOp,
                visible: null,
                active: null,
            };
        }

        return "command" in command
            ? command
            : {
                  command,
              };
    }
}

/**
 * Creates a menu plugin with the passed in entries
 * @param blocks The entries to use on the generated menu
 * @param containerFn A function that returns the container element for the menu
 * @internal
 */
export function createMenuPlugin(
    blocks: MenuBlock[],
    containerFn: (view: EditorView) => Node,
    editorType: EditorType
): Plugin {
    return new Plugin({
        view(editorView) {
            const menuView = new MenuView(blocks, editorView, editorType);
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
