import { EditorView } from "prosemirror-view";
import {
    interfaceManagerPlugin,
    ManagedInterfaceKey,
    PluginInterfaceView,
} from "../../../src/shared/prosemirror-plugins/interface-manager";
import { StatefulPlugin } from "../../../src/shared/prosemirror-plugins/plugin-extensions";
import { createState, createView } from "../../rich-text/test-helpers";

const { key: childKey1, plugin: childPlugin1 } = createPlugin("child1", {
    arbitraryData: "foo" as string,
    shouldShow: false as boolean,
});

const { key: childKey2, plugin: childPlugin2 } = createPlugin("child2", {
    arbitraryData: "bar" as string,
    shouldShow: false as boolean,
});

describe("interface-manager plugin", () => {
    let pluginContainer: Element;
    let view: EditorView;

    beforeEach(() => {
        pluginContainer = document.createElement("div");
        const state = createState("", [
            interfaceManagerPlugin(() => pluginContainer),
            childPlugin1,
            childPlugin2,
        ]);
        view = createView(state);
    });

    describe("interfaceManagerPlugin", () => {
        it("should dispatch show event on child key show requests", () => {
            const spy = jest.spyOn(view, "dispatch");
            childKey1.showInterface(view);

            expect(spy).toHaveBeenCalledTimes(1);

            const tr = spy.mock.calls[0][0];
            const parentMetadata = tr.getMeta("interface-manager$") as unknown;
            const childMetadata = tr.getMeta(childKey1) as unknown;

            expect(parentMetadata).toEqual({
                currentlyShown: childKey1,
                containerGetter: expect.any(Function) as unknown,
            });

            expect(childMetadata).toEqual({
                arbitraryData: "foo",
                shouldShow: true,
            });
        });

        it("should dispatch hide event on child key hide requests", () => {
            const spy = jest.spyOn(view, "dispatch");
            // show it once so we have something to hide
            childKey1.showInterface(view);

            // now hide it
            childKey1.hideInterface(view);
            expect(spy).toHaveBeenCalledTimes(2);

            const tr = spy.mock.calls[1][0];
            const parentMetadata = tr.getMeta("interface-manager$") as unknown;
            const childMetadata = tr.getMeta(childKey1) as unknown;

            expect(parentMetadata).toEqual({
                currentlyShown: null,
                containerGetter: expect.any(Function) as unknown,
            });

            expect(childMetadata).toEqual({
                arbitraryData: "foo",
                shouldShow: false,
            });
        });

        it("should dispatch hide event on child key show requests when a child is already showing", () => {
            const spy = jest.spyOn(view, "dispatch");

            // send the first "show"
            childKey1.showInterface(view);
            expect(spy).toHaveBeenCalledTimes(1);

            let tr = spy.mock.calls[0][0];
            let parentMetadata = tr.getMeta("interface-manager$") as unknown;
            let child1Metadata = tr.getMeta(childKey1) as unknown;
            let child2Metadata = tr.getMeta(childKey2) as unknown;

            expect(parentMetadata).toEqual({
                currentlyShown: childKey1,
                containerGetter: expect.any(Function) as unknown,
            });

            expect(child1Metadata).toEqual({
                arbitraryData: "foo",
                shouldShow: true,
            });

            expect(child2Metadata).toBeUndefined();

            // send the second "show"
            childKey2.showInterface(view);

            // show, hide, show
            expect(spy).toHaveBeenCalledTimes(3);

            // the hide transaction
            tr = spy.mock.calls[1][0];
            parentMetadata = tr.getMeta("interface-manager$") as unknown;
            child1Metadata = tr.getMeta(childKey1) as unknown;
            child2Metadata = tr.getMeta(childKey2) as unknown;

            expect(parentMetadata).toEqual({
                currentlyShown: null,
                containerGetter: expect.any(Function) as unknown,
            });

            expect(child1Metadata).toEqual({
                arbitraryData: "foo",
                shouldShow: false,
            });

            expect(child2Metadata).toBeUndefined();

            // the following show transaction
            tr = spy.mock.calls[2][0];
            parentMetadata = tr.getMeta("interface-manager$") as unknown;
            child1Metadata = tr.getMeta(childKey1) as unknown;
            child2Metadata = tr.getMeta(childKey2) as unknown;

            expect(parentMetadata).toEqual({
                currentlyShown: childKey2,
                containerGetter: expect.any(Function) as unknown,
            });

            expect(child1Metadata).toBeUndefined();

            expect(child2Metadata).toEqual({
                arbitraryData: "bar",
                shouldShow: true,
            });
        });

        it("should allow cancelling via event.preventDefault", () => {
            const spy = jest.spyOn(view, "dispatch");

            let shouldPreventDefault = true;
            let firedEvent: string = null;
            const callback = (e: CustomEvent) => {
                firedEvent = e.type;
                if (shouldPreventDefault) {
                    e.preventDefault();
                }
                expect(e.detail).toEqual({
                    arbitraryData: "foo",
                    shouldShow: expect.any(Boolean) as boolean,
                });
            };
            view.dom.addEventListener("StacksEditor:child1-show", callback);
            view.dom.addEventListener("StacksEditor:child1-hide", callback);

            // fire once with the action prevented
            let result = childKey1.showInterface(view);
            expect(result).toBe(false);
            expect(firedEvent).toBe("StacksEditor:child1-show");
            expect(spy).toHaveBeenCalledTimes(0);

            // fire once with the action NOT prevented
            shouldPreventDefault = false;
            firedEvent = null;
            result = childKey1.showInterface(view);
            expect(result).toBe(true);
            expect(firedEvent).toBe("StacksEditor:child1-show");
            expect(spy).toHaveBeenCalledTimes(1);

            // now make sure hide fires as well, with the action prevented
            shouldPreventDefault = true;
            firedEvent = null;
            result = childKey1.hideInterface(view);
            expect(result).toBe(false);
            expect(firedEvent).toBe("StacksEditor:child1-hide");
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it("should dispatch only when the state has changed", () => {
            const spy = jest.spyOn(view, "dispatch");

            // hide an unshown view
            let result = childKey1.hideInterface(view);
            expect(result).toBe(false);
            expect(spy).toHaveBeenCalledTimes(0);

            // show an unshown view
            result = childKey1.showInterface(view);
            expect(result).toBe(true);
            expect(spy).toHaveBeenCalledTimes(1);

            // show a shown view
            result = childKey1.showInterface(view);
            expect(result).toBe(false);
            expect(spy).toHaveBeenCalledTimes(1);

            // hide a shown view
            result = childKey1.hideInterface(view);
            expect(result).toBe(true);
            expect(spy).toHaveBeenCalledTimes(2);
        });

        it("should hide the currently shown child on ESC press", () => {
            const spy = jest.spyOn(view, "dispatch");
            childKey1.showInterface(view);

            expect(spy).toHaveBeenCalledTimes(1);

            let tr = spy.mock.calls[0][0];
            let parentMetadata = tr.getMeta("interface-manager$") as unknown;

            expect(parentMetadata).toEqual({
                currentlyShown: childKey1,
                containerGetter: expect.any(Function) as unknown,
            });

            view.dom.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape" })
            );

            expect(spy).toHaveBeenCalledTimes(2);

            tr = spy.mock.calls[1][0];
            parentMetadata = tr.getMeta("interface-manager$") as unknown;

            expect(parentMetadata).toEqual({
                currentlyShown: null,
                containerGetter: expect.any(Function) as unknown,
            });
        });
    });

    describe("PluginInterfaceView", () => {
        it("should build/teardown the container on show/hide", () => {
            childKey1.showInterface(view);
            expect(pluginContainer.innerHTML).toBe(childKey1.name + "build");

            childKey1.hideInterface(view);
            expect(pluginContainer.innerHTML).toBe(
                childKey1.name + "build" + childKey1.name + "destroy"
            );
        });
    });

    describe("ManagedInterfaceKey", () => {
        it("should expose the correct name", () => {
            const key = new ManagedInterfaceKey("foo");
            expect(key.name).toBe("foo");
        });

        it("should return the plugin container from getContainer", () => {
            const container = childKey1.getContainer(view);
            expect(container).toBe(pluginContainer);
        });

        it("should allow for overwriting state data on show/hide", () => {
            expect(childKey1.getState(view.state)).toStrictEqual({
                arbitraryData: "foo",
                shouldShow: false,
            });

            childKey1.showInterface(view, {
                arbitraryData: "foo1",
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error we want to pass this in anyways to ensure it is not taken into account
                shouldShow: false, // NOTE: this one is overwritten by showInterface
            });

            expect(childKey1.getState(view.state)).toStrictEqual({
                arbitraryData: "foo1",
                shouldShow: true,
            });

            childKey1.hideInterface(view, {
                arbitraryData: "foo2",
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error we want to pass this in anyways to ensure it is not taken into account
                shouldShow: true, // NOTE: this one is overwritten by hideInterface
            });

            expect(childKey1.getState(view.state)).toStrictEqual({
                arbitraryData: "foo2",
                shouldShow: false,
            });
        });
    });
});

class ChildInterfacePluginView<
    TData extends { shouldShow: boolean },
    TKey extends ManagedInterfaceKey<TData>
> extends PluginInterfaceView<TData, TKey> {
    buildInterface(container: Element): void {
        container.append(document.createTextNode(this.key.name + "build"));
    }
    destroyInterface(container: Element): void {
        container.append(document.createTextNode(this.key.name + "destroy"));
    }
}

function createPlugin<T extends { shouldShow: boolean }>(
    name: string,
    data: T
) {
    const key = new ManagedInterfaceKey<T>(name);
    const plugin = new StatefulPlugin<T>({
        key: key,
        state: {
            init: () => data,
            apply(tr) {
                return {
                    ...data,
                    ...this.getMeta(tr),
                };
            },
        },
        view: () => new ChildInterfacePluginView(key),
    });

    return { key, plugin };
}
