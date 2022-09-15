import {
    addIf,
    makeDropdownItem,
    makeDropdownSection,
    makeMenuButton,
    makeMenuDropdown,
    makeMenuLinkEntry,
    MenuCommandExtended,
    MenuItem,
} from "../../../src/shared/menu";

describe("menu helpers", () => {
    it("should makeMenuButton", () => {
        const iconName = "testIcon";
        const key = "testKey";
        const title = "test title";
        const cssClasses = ["testClass1", "testClass2"];

        const icon = makeMenuButton(iconName, title, key, cssClasses);
        expect(icon.nodeName).toBe("BUTTON");
        expect(icon.classList).toContain(`js-${key}`);
        expect(icon.title).toBe(title);
        (cssClasses || []).forEach((c) => {
            expect(icon.classList).toContain(c);
        });
        expect(icon.children).toHaveLength(1);
        expect(icon.firstChild.nodeName).toBe("SPAN");
        expect(icon.firstElementChild.classList).toContain(`icon${iconName}`);
    });

    it("should makeMenuLinkEntry", () => {
        const iconName = "testIcon";
        const title = "test title";
        const href = "http://example.com/";
        const key = "testKey";
        const entry = makeMenuLinkEntry(iconName, title, href, key);

        const link = entry.display as HTMLAnchorElement;

        expect(entry.key).toBe(key);
        expect(link.nodeName).toBe("A");
        expect(link.target).toBe("_blank");
        expect(link.href).toBe(href);
        expect(link.classList).toContain(`js-${key}`);

        expect(link.children).toHaveLength(1);
        expect(link.firstChild.nodeName).toBe("SPAN");
        expect(link.firstElementChild.classList).toContain(`icon${iconName}`);
    });

    it("should makeDropdownSection", () => {
        const item = makeDropdownSection("title", "key");
        const dom = item.display as HTMLElement;

        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        const expectedCommandShape = {
            command: expect.any(Function),
            active: expect.any(Function),
            visible: expect.any(Function),
        };
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */

        // check returned props
        expect(item.key).toBe("key");
        expect(dom.dataset.key).toBe("key");
        expect(dom.textContent).toBe("title");
        expect(item.richText).toMatchObject(expectedCommandShape);
        expect(item.commonmark).toMatchObject(expectedCommandShape);
        // the returned commands should be the exact same object reference
        expect(Object.is(item.commonmark, item.richText)).toBe(true);

        // check returned commands as best we can
        const commands = item.commonmark as MenuCommandExtended;
        expect(commands.command(null, null)).toBe(true);
        expect(commands.visible(null)).toBe(true);
        expect(commands.active(null)).toBe(false);
    });

    it("should makeMenuDropdown", () => {
        const fn = jest.fn();
        const commands = {
            command: expect.any(Function) as () => boolean,
            active: fn,
            visible: fn,
        };
        const children: MenuItem[] = [
            {
                key: "k2",
                richText: null,
                commonmark: null,
                display: null,
            },
        ];
        const item = makeMenuDropdown(
            "svg",
            "label",
            "key",
            fn,
            fn,
            ...children
        );

        expect(item).toMatchObject({
            key: "key",
            display: {
                svg: "svg",
                label: "label",
            },
            children: expect.any(Array) as Array<MenuItem>,
            richText: commands,
            commonmark: commands,
        });

        expect(item.children).toContainEqual(children[0]);
        expect(Object.is(item.commonmark, item.richText)).toBe(true);
        expect(
            (item.commonmark as MenuCommandExtended).command(null, null)
        ).toBe(true);
    });

    it("should makeDropdownItem", () => {
        const commands = {
            richText: jest.fn(),
            commonmark: jest.fn(),
        };

        const item = makeDropdownItem("label", commands, "key", ["class1"]);
        const dom = item.display as HTMLButtonElement;

        expect(dom.type).toBe("button");
        expect(dom.dataset.key).toBe("key");
        expect(dom.textContent).toBe("label");
        expect(dom.classList).toContain("class1");
        expect(item.key).toBe("key");
        expect(item.richText).toBe(commands.richText);
        expect(item.commonmark).toBe(commands.commonmark);
    });

    it("should addIf", () => {
        // test add
        const menuItem: MenuItem = {
            key: "key",
            richText: null,
            commonmark: null,
            display: null,
        };
        const added = addIf(menuItem, true);
        expect(Object.is(menuItem, added)).toBe(true);

        expect(addIf(menuItem, false)).toBeNull();
    });
});
