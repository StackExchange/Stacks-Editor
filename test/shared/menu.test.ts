import {
    addIf,
    makeMenuIcon,
    makeMenuLinkEntry,
    makeMenuSpacerEntry,
    MenuCommandEntry,
} from "../../src/shared/menu";

describe("menu", () => {
    describe("basic functionality", () => {
        it.todo("constructor");
        it.todo("createMenuPlugin");
    });

    describe("dropdowns", () => {
        it.todo("makeMenuDropdown");
        it.todo("dropdownItem");
        it.todo("dropdownSection");
        it.todo("single active");
        it.todo("multiple active");
    });

    describe("utils", () => {
        it("should addIf true and not addIf false", () => {
            const entry: MenuCommandEntry = {
                command: null,
                dom: null,
                key: null,
            };
            expect(addIf(entry, true)).not.toBeNull();
            expect(addIf(entry, false)).toBeNull();
        });

        it("makeMenuIcon", () => {
            const iconName = "testIcon";
            const key = "testKey";
            const title = "test title";
            const cssClasses = ["testClass1", "testClass2"];

            const icon = makeMenuIcon(iconName, title, key, cssClasses);
            expect(icon.nodeName).toBe("BUTTON");
            expect(icon.classList).toContain(`js-${key}`);
            expect(icon.title).toBe(title);
            (cssClasses || []).forEach((c) => {
                expect(icon.classList).toContain(c);
            });
            expect(icon.children).toHaveLength(1);
            expect(icon.firstChild.nodeName).toBe("SPAN");
            expect(icon.firstElementChild.classList).toContain(
                `icon${iconName}`
            );
        });

        it("makeMenuSpacerEntry", () => {
            const entry = makeMenuSpacerEntry(null, []);
            expect(entry.dom).toBeDefined();
            expect(entry.key).toBe("spacer");
        });

        it("makeMenuLinkEntry", () => {
            const iconName = "testIcon";
            const title = "test title";
            const href = "http://example.com/";
            const entry = makeMenuLinkEntry(iconName, title, href);

            const link = entry.dom as HTMLAnchorElement;

            expect(entry.key).toBe(title);
            expect(link.nodeName).toBe("A");
            expect(link.target).toBe("_blank");
            expect(link.href).toBe(href);

            expect(link.children).toHaveLength(1);
            expect(link.firstChild.nodeName).toBe("SPAN");
            expect(link.firstElementChild.classList).toContain(
                `icon${iconName}`
            );
        });
    });
});
