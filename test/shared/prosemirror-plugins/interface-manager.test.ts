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
            const tr = childKey1.showInterfaceTr(view.state);
            expect(tr).not.toBeNull();

            const parentMetadata = tr.getMeta("interface-manager$") as unknown;
            const childMetadata = tr.getMeta(childKey1) as unknown;

            expect(parentMetadata).toEqual({
                dom: expect.any(Element) as Element,
                currentlyShown: childKey1,
                containerGetter: expect.any(Function) as unknown,
            });

            expect(childMetadata).toEqual({
                arbitraryData: "foo",
                shouldShow: true,
            });
        });

        it("should dispatch hide event on child key hide requests", () => {
            // show it once so we have something to hide
            let tr = childKey1.showInterfaceTr(view.state);
            expect(tr).not.toBeNull();

            // now hide it
            tr = childKey1.hideInterfaceTr(view.state.apply(tr));
            expect(tr).not.toBeNull();

            const parentMetadata = tr.getMeta("interface-manager$") as unknown;
            const childMetadata = tr.getMeta(childKey1) as unknown;

            expect(parentMetadata).toEqual({
                dom: expect.any(Element) as Element,
                currentlyShown: null,
                containerGetter: expect.any(Function) as unknown,
            });

            expect(childMetadata).toEqual({
                arbitraryData: "foo",
                shouldShow: false,
            });
        });

        it("should dispatch hide event on child key show requests when a child is already showing", () => {
            // send the first "show"
            let tr = childKey1.showInterfaceTr(view.state);
            expect(tr).not.toBeNull();

            let parentMetadata = tr.getMeta("interface-manager$") as unknown;
            let child1Metadata = tr.getMeta(childKey1) as unknown;
            let child2Metadata = tr.getMeta(childKey2) as unknown;

            expect(parentMetadata).toEqual({
                dom: expect.any(Element) as Element,
                currentlyShown: childKey1,
                containerGetter: expect.any(Function) as unknown,
            });

            expect(child1Metadata).toEqual({
                arbitraryData: "foo",
                shouldShow: true,
            });

            expect(child2Metadata).toBeUndefined();

            // send the second "show"
            tr = childKey2.showInterfaceTr(view.state.apply(tr));
            expect(tr).not.toBeNull();

            // should have the metadata from the hide transaction as well as the following show transaction
            parentMetadata = tr.getMeta("interface-manager$") as unknown;
            child1Metadata = tr.getMeta(childKey1) as unknown;
            child2Metadata = tr.getMeta(childKey2) as unknown;

            expect(parentMetadata).toEqual({
                dom: expect.any(Element) as Element,
                currentlyShown: childKey2,
                containerGetter: expect.any(Function) as unknown,
            });

            expect(child1Metadata).toEqual({
                arbitraryData: "foo",
                shouldShow: false,
            });

            expect(child2Metadata).toEqual({
                arbitraryData: "bar",
                shouldShow: true,
            });
        });

        it("should allow cancelling via event.preventDefault", () => {
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
            let result = childKey1.showInterfaceTr(view.state);
            expect(result).toBeNull();
            expect(firedEvent).toBe("StacksEditor:child1-show");

            // fire once with the action NOT prevented
            shouldPreventDefault = false;
            firedEvent = null;
            result = childKey1.showInterfaceTr(view.state);
            expect(result).not.toBeNull();
            expect(firedEvent).toBe("StacksEditor:child1-show");

            // now make sure hide fires as well, with the action prevented
            shouldPreventDefault = true;
            firedEvent = null;
            result = childKey1.hideInterfaceTr(view.state.apply(result));
            expect(result).toBeNull();
            expect(firedEvent).toBe("StacksEditor:child1-hide");
        });

        it("should dispatch only when the state has changed", () => {
            let state = view.state;

            // hide an unshown view
            let result = childKey1.hideInterfaceTr(state);
            expect(result).toBeNull();

            // show an unshown view
            result = childKey1.showInterfaceTr(state);
            expect(result).not.toBeNull();
            state = state.apply(result);

            // show a shown view
            result = childKey1.showInterfaceTr(state);
            expect(result).toBeNull();

            // hide a shown view
            result = childKey1.hideInterfaceTr(state);
            expect(result).not.toBeNull();
        });

        it("should hide the currently shown child on ESC press", () => {
            const spy = jest.spyOn(view, "dispatch");
            view.dispatch(childKey1.showInterfaceTr(view.state));

            expect(spy).toHaveBeenCalledTimes(1);

            let tr = spy.mock.calls[0][0];
            let parentMetadata = tr.getMeta("interface-manager$") as unknown;

            expect(parentMetadata).toEqual({
                dom: expect.any(Element) as Element,
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
                dom: expect.any(Element) as Element,
                currentlyShown: null,
                containerGetter: expect.any(Function) as unknown,
            });
        });
    });

    describe("PluginInterfaceView", () => {
        it("should build/teardown the container on show/hide", () => {
            view.dispatch(childKey1.showInterfaceTr(view.state));
            expect(pluginContainer.innerHTML).toBe(childKey1.name + "build");

            view.dispatch(childKey1.hideInterfaceTr(view.state));
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
            let state = view.state;

            expect(childKey1.getState(state)).toStrictEqual({
                arbitraryData: "foo",
                shouldShow: false,
            });

            let tr = childKey1.showInterfaceTr(state, {
                arbitraryData: "foo1",
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error we want to pass this in anyways to ensure it is not taken into account
                shouldShow: false, // NOTE: this one is overwritten by showInterface
            });
            state = state.apply(tr);

            expect(childKey1.getState(state)).toStrictEqual({
                arbitraryData: "foo1",
                shouldShow: true,
            });

            tr = childKey1.hideInterfaceTr(state, {
                arbitraryData: "foo2",
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error we want to pass this in anyways to ensure it is not taken into account
                shouldShow: true, // NOTE: this one is overwritten by hideInterface
            });
            state = state.apply(tr);

            expect(childKey1.getState(state)).toStrictEqual({
                arbitraryData: "foo2",
                shouldShow: false,
            });
        });
    });
});

class ChildInterfacePluginView<
    TData extends { shouldShow: boolean },
    TKey extends ManagedInterfaceKey<TData>,
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
