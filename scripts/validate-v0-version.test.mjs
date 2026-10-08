import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { validateV0Version } from "./validate-v0-version.mjs";

describe("validateV0Version", () => {
    test("accepts any stable version with major version zero", () => {
        for (const version of [
            "0.0.0",
            "0.14.9",
            "0.15.0",
            "0.15.4",
            "0.15.99",
            "0.16.0",
            "0.99.99",
        ]) {
            assert.equal(validateV0Version(version), version);
        }
    });

    test("accepts prereleases and build metadata with major version zero", () => {
        for (const version of [
            "0.16.0-alpha.0",
            "0.16.0-beta.1",
            "0.16.0-rc.1",
            "0.16.0+build.123",
            "0.16.0-beta.1+build.123",
        ]) {
            assert.equal(validateV0Version(version), version);
        }
    });

    test("rejects versions with a nonzero major version", () => {
        for (const version of [
            "1.0.0",
            "1.0.0-beta.1",
            "1.0.0+build.123",
            "2.0.0",
            "2.0.0-rc.1",
        ]) {
            assert.throws(() => validateV0Version(version));
        }
    });

    test("rejects invalid semantic versions", () => {
        for (const version of [
            "",
            "not-a-version",
            "0.16",
            "0.16.x",
            "0.16.0-beta.01",
        ]) {
            assert.throws(() => validateV0Version(version));
        }
    });
});
