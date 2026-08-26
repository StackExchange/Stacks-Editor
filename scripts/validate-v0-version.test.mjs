import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { validateV0Version } from "./validate-v0-version.mjs";

describe("validateV0Version", () => {
    test("accepts stable versions on the 0.15.x maintenance line", () => {
        for (const version of ["0.15.0", "0.15.4", "0.15.99"]) {
            assert.equal(validateV0Version(version), version);
        }
    });

    test("rejects versions outside the stable 0.15.x maintenance line", () => {
        for (const version of [
            "",
            "0.14.9",
            "0.15.5-beta.0",
            "0.16.0",
            "1.0.0",
        ]) {
            assert.throws(() => validateV0Version(version));
        }
    });
});
