import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import semver from "semver";

const readRepositoryFile = (path) =>
    readFile(new URL(`../${path}`, import.meta.url), "utf8");

describe("stable release configuration", () => {
    test("uses stable V3 package metadata", async () => {
        const packageJson = JSON.parse(
            await readRepositoryFile("package.json")
        );
        const packageLock = JSON.parse(
            await readRepositoryFile("package-lock.json")
        );
        const version = semver.parse(packageJson.version);

        assert.equal(version?.major, 1);
        assert.equal(packageLock.version, packageJson.version);
        assert.equal(packageLock.packages[""].version, packageJson.version);
        assert.equal(
            packageJson.devDependencies["@stackoverflow/stacks"],
            "^3.0.0"
        );
        assert.equal(
            packageJson.peerDependencies["@stackoverflow/stacks"],
            "^3.0.0"
        );
        assert.equal(
            packageJson.dependencies["@stackoverflow/stacks-icons"],
            "^6.2.0"
        );
    });

    test("publishes only from main after every release gate passes", async () => {
        const workflow = await readRepositoryFile(".github/workflows/main.yml");
        const changesetConfig = JSON.parse(
            await readRepositoryFile(".changeset/config.json")
        );
        const codeowners = await readRepositoryFile(".github/CODEOWNERS");

        assert.equal(workflow.match(/branches: \[main\]/g)?.length, 2);
        assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
        assert.match(workflow, /publish: npm run release/);
        assert.match(workflow, /branch: main/);
        assert.match(workflow, /createGithubReleases: true/);
        assert.match(
            workflow,
            /needs: \[lint, unit-test, e2e-test, package-test, release-config-test\]/
        );
        assert.doesNotMatch(workflow, /refs\/heads\/beta/);
        assert.equal(changesetConfig.baseBranch, "main");
        assert.equal(codeowners.trim(), "* @StackExchange/stacks");
    });

    test("has exited prerelease mode when prerelease state exists", async () => {
        const preJsonPath = new URL("../.changeset/pre.json", import.meta.url);
        const packageJson = JSON.parse(
            await readRepositoryFile("package.json")
        );

        if (existsSync(preJsonPath)) {
            const preState = JSON.parse(await readFile(preJsonPath, "utf8"));

            assert.equal(packageJson.version, "1.0.0-beta.5");
            assert.equal(preState.mode, "exit");
            assert.equal(
                preState.initialVersions["@stackoverflow/stacks-editor"],
                "0.15.3"
            );
            assert.deepEqual(preState.changesets, [
                "better-deer-tap",
                "mean-tools-hammer",
                "ninety-lizards-report",
                "odd-rules-jump",
                "ripe-carpets-pull",
                "wise-horses-wear",
            ]);
            assert.match(
                await readRepositoryFile(".changeset/wise-horses-wear.md"),
                /"@stackoverflow\/stacks-editor": major/
            );
            assert.match(
                await readRepositoryFile(".changeset/stable-editor-release.md"),
                /"@stackoverflow\/stacks-editor": patch/
            );
        } else {
            assert.equal(packageJson.version, "1.0.0");
            assert.match(
                await readRepositoryFile("CHANGELOG.md"),
                /^## 1\.0\.0$/m
            );
        }
    });

    test("removes beta branding from the stable site", async () => {
        const layout = await readRepositoryFile("site/layout.html");
        const index = await readRepositoryFile("site/views/index.html");

        assert.doesNotMatch(layout, /\[BETA\]|>Beta</i);
        assert.doesNotMatch(index, /\[BETA\]|>Beta</i);
    });

    test("does not rely on the removed V2 block-link component", async () => {
        const layout = await readRepositoryFile("site/layout.html");
        const menuHelpers = await readRepositoryFile(
            "src/shared/menu/helpers.ts"
        );

        assert.doesNotMatch(layout, /s-block-link/);
        assert.doesNotMatch(menuHelpers, /s-block-link/);
        assert.match(layout, /s-menu--item/);
        assert.match(menuHelpers, /s-menu--action/);
    });
});
