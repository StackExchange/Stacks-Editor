import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import semver from "semver";
import jestConfig from "../config/jest-unit.config.js";

const readRepositoryFile = (path) =>
    readFile(new URL(`../${path}`, import.meta.url), "utf8");

describe("stable release configuration", () => {
    test("keeps emitted test copies out of unit-test discovery", () => {
        const ignored = jestConfig.testPathIgnorePatterns.map(
            (pattern) => new RegExp(pattern.replace("<rootDir>", "/editor"))
        );
        assert.ok(
            ignored.some((pattern) =>
                pattern.test(
                    "/editor/dist/plugins/official/stack-snippets/test/common.test.js"
                )
            )
        );
        assert.ok(
            ignored.every(
                (pattern) =>
                    !pattern.test(
                        "/editor/plugins/official/stack-snippets/test/common.test.ts"
                    )
            )
        );
    });

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
        const iconsVersion = semver.minVersion(
            packageJson.dependencies["@stackoverflow/stacks-icons"]
        );
        assert.equal(iconsVersion?.major, 6);
        assert.equal(iconsVersion?.prerelease.length, 0);
    });

    test("publishes only from main after every release gate passes", async () => {
        const workflow = await readRepositoryFile(".github/workflows/main.yml");
        const changesetConfig = JSON.parse(
            await readRepositoryFile(".changeset/config.json")
        );
        const codeowners = await readRepositoryFile(".github/CODEOWNERS");

        assert.equal(workflow.match(/branches: \[main\]/g)?.length, 2);
        assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
        assert.match(workflow, /publish-script: npm run release/);
        assert.match(workflow, /pr-base-branch: main/);
        assert.match(workflow, /create-github-releases: true/);
        assert.match(workflow, /^permissions:\n    contents: read$/m);
        assert.match(
            workflow,
            /release:\n(?:.|\n)*?        permissions:\n            contents: write\n            pull-requests: write\n/m
        );
        assert.match(
            workflow,
            /needs: \[lint, unit-test, e2e-test, package-test, release-config-test\]/
        );
        assert.doesNotMatch(workflow, /refs\/heads\/beta/);
        assert.equal(changesetConfig.baseBranch, "main");
        assert.match(codeowners, /^\* @StackExchange\/stacks$/m);
    });

    test("uses Changesets v3-compatible release automation", async () => {
        const workflow = await readRepositoryFile(".github/workflows/main.yml");
        const releaseJob = workflow.slice(workflow.indexOf("    release:\n"));
        const packageJson = JSON.parse(
            await readRepositoryFile("package.json")
        );
        const cliVersion = semver.minVersion(
            packageJson.devDependencies["@changesets/cli"]
        );

        assert.equal(cliVersion?.major, 3);
        assert.match(releaseJob, /uses: changesets\/action@v2\.1\.2\s/);
        assert.match(releaseJob, /version-script: npm run version/);
        assert.match(releaseJob, /publish-script: npm run release/);
        assert.match(releaseJob, /pr-title: "chore\(new-release\)"/);
        assert.match(releaseJob, /commit-message: "chore\(new-release\)"/);
        assert.match(releaseJob, /push-git-tags: true/);
        assert.match(releaseJob, /push-with-git-cli: true/);
        assert.match(releaseJob, /if: steps\.changesets\.outputs\.pr-number/);
        assert.match(
            releaseJob,
            /pr-number: \$\{\{ steps\.changesets\.outputs\.pr-number \}\}/
        );
        assert.doesNotMatch(
            releaseJob,
            /pullRequestNumber|createGithubReleases|^\s+(version|publish|title|commit|branch):/m
        );
    });

    test("configures release authentication without Changesets v1 npmrc handling", async () => {
        const workflow = await readRepositoryFile(".github/workflows/main.yml");
        const releaseJob = workflow.slice(workflow.indexOf("    release:\n"));

        assert.match(
            releaseJob,
            /uses: actions\/setup-node@v4\n\s+with:\n\s+node-version: lts\/\*\n\s+cache: "npm"\n\s+registry-url: "https:\/\/registry\.npmjs\.org"/
        );
        assert.match(
            releaseJob,
            /github-token: \$\{\{ secrets\.STACKS_TOOLING_GH_RW_PAT \}\}/
        );
        assert.match(
            releaseJob,
            /env:\n\s+NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_API_KEY \}\}/
        );
        assert.doesNotMatch(releaseJob, /^\s+(GITHUB_TOKEN|NPM_TOKEN):/m);
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
            const version = semver.parse(packageJson.version);
            assert.ok(version, "Package version must be valid semver");
            assert.equal(version.prerelease.length, 0);
            assert.match(
                await readRepositoryFile("CHANGELOG.md"),
                /^## 1\.0\.0$/m
            );
        }
    });

    test("does not retain consumed prerelease changesets after beta exit", async (t) => {
        if (existsSync(new URL("../.changeset/pre.json", import.meta.url))) {
            t.skip("Prerelease exit has not been applied yet");
            return;
        }

        const preDirectory = new URL("../.changeset/pre/", import.meta.url);
        const files = existsSync(preDirectory)
            ? await readdir(preDirectory)
            : [];

        // Changesets 3 reads this directory as release input, not an archive.
        assert.deepEqual(
            files.filter((file) => file.endsWith(".md")),
            [],
            "Consumed prerelease changesets must be removed after beta exit"
        );
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
