import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8")
);

describe("published package artifact", () => {
    test("contains every public export", () => {
        const packResult = JSON.parse(
            execFileSync(
                "npm",
                ["pack", "--dry-run", "--json", "--ignore-scripts"],
                { encoding: "utf8" }
            )
        )[0];
        const packedFiles = new Set(packResult.files.map(({ path }) => path));
        const exportTargets = Object.values(packageJson.exports).flatMap(
            (entry) =>
                typeof entry === "string" ? [entry] : Object.values(entry)
        );

        for (const target of exportTargets) {
            assert.ok(
                packedFiles.has(target.replace(/^\.\//, "")),
                `${target} is missing from the packed package`
            );
        }
    });
});
