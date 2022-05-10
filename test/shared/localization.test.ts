import { registerLocalizationStrings, _t } from "../../src/shared/localization";

describe("localization", () => {
    it("should find nested entries", () => {
        expect(_t("link_tooltip.apply_button_text")).toBe("Apply");
    });

    it("should execute function values with params passed", () => {
        expect(_t("nodes.codeblock_lang_auto", { lang: "test" })).toBe(
            "test (auto)"
        );
    });

    it("should throw when an entry is not found", () => {
        expect(() => _t("fake.faker.fakest")).toThrow(
            /^Missing translation for key:/
        );
    });

    it("should allow overriding a partial set of strings", () => {
        registerLocalizationStrings({
            nodes: {
                spoiler_reveal_text: "Раскрыть спойлер",
            },
        });

        // overridden
        expect(_t("nodes.spoiler_reveal_text")).toBe("Раскрыть спойлер");
        // not overridden - falls back to default
        expect(_t("link_tooltip.apply_button_text")).toBe("Apply");
    });
});
