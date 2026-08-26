import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import { URL } from "node:url";

import { validateNpmDistTag } from "./validate-npm-dist-tag.mjs";

describe("validateNpmDistTag", () => {
    test("accepts descriptive non-SemVer tags", () => {
        for (const tag of ["legacy-v0", "beta", "next"]) {
            assert.equal(validateNpmDistTag(tag), tag);
        }
    });

    test("rejects invalid and SemVer-like tags", () => {
        for (const tag of [
            "",
            "0",
            "0.x",
            "v0",
            "V0",
            "x",
            "x.x",
            "x.x.x",
            "^0",
            "latest tag",
        ]) {
            assert.throws(() => validateNpmDistTag(tag));
        }
    });

    test("validates the same tag that the V0 release publishes", async () => {
        const packageJson = JSON.parse(
            await readFile(new URL("../package.json", import.meta.url), "utf8")
        );
        const releaseScript = packageJson.scripts["release:v0"];
        const defaultReleaseScript = packageJson.scripts.release;
        const validationTags = [
            ...releaseScript.matchAll(/validate-npm-dist-tag\.mjs (\S+)/g),
        ].map((match) => match[1]);
        const publishInvocations = [
            ...releaseScript.matchAll(
                /\bchangeset publish\b(?:\s+--tag(?:=|\s+)([^\s&]+))?/g
            ),
        ];
        const publishTags = publishInvocations.map((match) => match[1]);

        assert.deepEqual(validationTags, ["legacy-v0"]);
        assert.equal(publishInvocations.length, 1);
        assert.deepEqual(publishTags, validationTags);
        assert.equal(validateNpmDistTag(publishTags[0]), "legacy-v0");
        assert.equal(defaultReleaseScript, "npm run release:v0");
        assert.match(releaseScript, /validate-v0-version\.mjs/);
        assert.match(packageJson.scripts.version, /validate-v0-version\.mjs/);
    });

    test("keeps all V0 release configuration on the maintenance branch", async () => {
        const workflow = await readFile(
            new URL("../.github/workflows/main.yml", import.meta.url),
            "utf8"
        );
        const changesetConfig = JSON.parse(
            await readFile(
                new URL("../.changeset/config.json", import.meta.url),
                "utf8"
            )
        );
        const codeowners = await readFile(
            new URL("../.github/CODEOWNERS", import.meta.url),
            "utf8"
        );

        assert.equal(workflow.match(/branches: \[v0\]/g)?.length, 2);
        assert.match(workflow, /if: github\.ref == 'refs\/heads\/v0'/);
        assert.match(workflow, /publish: npm run release:v0/);
        assert.match(workflow, /branch: v0/);
        assert.match(workflow, /createGithubReleases: false/);
        assert.match(
            workflow,
            /needs: \[lint, unit-test, e2e-test, release-config-test\]/
        );
        assert.doesNotMatch(workflow, /refs\/heads\/(?:main|beta)/);
        assert.equal(changesetConfig.baseBranch, "v0");
        assert.equal(codeowners.trim(), "* @StackExchange/stacks");
    });
});
