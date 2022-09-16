import { textCopyHandlerPlugin } from "../../../src/commonmark/plugins/text-copy-handler";
import { applySelection, createView } from "../../rich-text/test-helpers";
import { createState } from "../test-helpers";

describe("copy-text-handler plugin", () => {
    it("should return only text on copy", () => {
        let data: Record<string, string> = {};
        const clipboardData = {
            clearData: jest.fn(() => {
                data = {};
            }),
            setData: jest.fn((type: string, contents: string) => {
                data[type] = contents;
            }),
        };

        const evt = () => {
            const evt = new Event("copy");
            // TODO add to `setupPasteSupport`
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore we're monkey-patching since JSDom doesn't support ClipboardEvent
            evt.clipboardData = clipboardData;
            return evt;
        };

        // assert that we get html *without* the plugin added
        let state = applySelection(createState("this is a test", []), 0, 14);
        const view = createView(state);
        view.dom.dispatchEvent(evt());

        expect(clipboardData.clearData).toHaveBeenCalledTimes(1);
        expect(clipboardData.setData).toHaveBeenCalledTimes(2);
        expect(data["text/plain"]).toBe("this is a test");
        expect(data["text/html"]).toContain("<code>this is a test</code>");

        // now add in the plugin and assert that we get text only
        state = applySelection(
            state.reconfigure({
                plugins: [textCopyHandlerPlugin],
            }),
            0,
            14
        );
        view.updateState(state);
        view.dom.dispatchEvent(evt());

        expect(clipboardData.clearData).toHaveBeenCalledTimes(2);
        expect(clipboardData.setData).toHaveBeenCalledTimes(4);
        expect(data).toMatchObject({
            "text/plain": "this is a test",
            "text/html": "this is a test",
        });
    });
});
