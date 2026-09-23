import { readFileSync } from "node:fs";
import { join } from "node:path";

const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/dependabot-auto-merge.yml"),
    "utf8"
);
const codeOwners = readFileSync(
    join(process.cwd(), ".github/CODEOWNERS"),
    "utf8"
);

function getStep(name: string) {
    const lines = workflow.split("\n");
    const start = lines.findIndex((line) => line.trim() === `- name: ${name}`);

    if (start === -1) {
        throw new Error(`Workflow step not found: ${name}`);
    }

    const stepIndent = lines[start].search(/\S/);
    const end = lines.findIndex(
        (line, index) =>
            index > start &&
            line.trim().startsWith("- name:") &&
            line.search(/\S/) === stepIndent
    );

    return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

describe("Dependabot auto-merge workflow", () => {
    it("limits automation to eligible Dependabot updates", () => {
        const metadata = getStep("Dependabot metadata");
        const approval = getStep("Approve eligible Dependabot PR");
        const autoMerge = getStep("Enable auto-merge for Dependabot PRs");
        const eligibleUpdate =
            "steps.metadata.outputs.update-type == 'version-update:semver-minor' || steps.metadata.outputs.update-type == 'version-update:semver-patch'";

        expect(workflow).toContain(
            "github.actor == 'dependabot[bot]' && github.event.pull_request.user.login == 'dependabot[bot]'"
        );
        expect(metadata).toContain(
            "dependabot/fetch-metadata@25dd0e34f4fe68f24cc83900b1fe3fe149efef98"
        );
        for (const step of [approval, autoMerge]) {
            expect(step).toContain(eligibleUpdate);
        }
    });

    it("binds approval and auto-merge to the evaluated head", () => {
        const approval = getStep("Approve eligible Dependabot PR");
        const autoMerge = getStep("Enable auto-merge for Dependabot PRs");

        expect(approval).toContain('-f commit_id="$HEAD_SHA"');
        expect(approval).toContain(
            "GH_TOKEN: ${{ secrets.STACKS_TOOLING_GH_RW_PAT }}"
        );
        expect(autoMerge).toContain('--match-head-commit "$HEAD_SHA"');
        expect(autoMerge).toContain("GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
    });

    it("limits automated code ownership to root dependency manifests", () => {
        expect(codeOwners.trim().split("\n")).toEqual(
            expect.arrayContaining([
                "* @StackExchange/stacks",
                "/package.json @StackExchange/stacks @stacks-tooling",
                "/package-lock.json @StackExchange/stacks @stacks-tooling",
            ])
        );
    });
});
