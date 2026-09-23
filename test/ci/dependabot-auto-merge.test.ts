import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "node:process";

const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/dependabot-auto-merge.yml"),
    "utf8"
);
const codeOwners = readFileSync(
    join(process.cwd(), ".github/CODEOWNERS"),
    "utf8"
);

function extractStep(name: string) {
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
    const stepLines = lines.slice(start, end === -1 ? undefined : end);
    const runIndex = stepLines.findIndex((line) => line.trim() === "run: |");

    if (runIndex === -1) {
        throw new Error(`Workflow step has no multiline run block: ${name}`);
    }

    const runIndent = stepLines[runIndex].search(/\S/);
    const linesAfterRun = stepLines.slice(runIndex + 1);
    const runEnd = linesAfterRun.findIndex(
        (line) => line.trim().length && line.search(/\S/) <= runIndent
    );
    const runLines = linesAfterRun.slice(0, runEnd === -1 ? undefined : runEnd);
    const contentIndent = runLines
        .find((line) => line.trim().length)
        ?.search(/\S/);

    if (contentIndent === undefined || contentIndent < 0) {
        throw new Error(`Workflow step has an empty run block: ${name}`);
    }

    return {
        block: stepLines.join("\n"),
        run: runLines.map((line) => line.slice(contentIndent)).join("\n"),
    };
}

const dependabotCommit = {
    sha: "event-head",
    author: { login: "dependabot[bot]" },
    commit: { verification: { verified: true } },
};

const mockGh = String.raw`
gh() {
    if [[ "$*" == *"/commits?"* ]]; then
        printf '%s\n' "$MOCK_COMMITS"
    elif [[ "$*" == *"/files?"* ]]; then
        printf '%s\n' "$MOCK_FILES"
    elif [[ "$*" == *"--jq .head.sha"* ]]; then
        printf '%s\n' "$MOCK_FINAL_HEAD"
    else
        printf '%s\n' "$MOCK_PR"
    fi
}
export -f gh
`;

interface ValidationOptions {
    commits: unknown[][];
    files: { filename: string }[][];
    finalHead: string;
    commitCount: number;
    changedFileCount: number;
}

function runValidation(options: Partial<ValidationOptions> = {}) {
    const commits = options.commits ?? [[dependabotCommit]];
    const files = options.files ?? [[{ filename: "package-lock.json" }]];
    const finalHead = options.finalHead ?? "event-head";
    const commitCount = options.commitCount ?? commits.flat().length;
    const changedFileCount = options.changedFileCount ?? files.flat().length;
    const { run } = extractStep("Validate eligible Dependabot PR");

    return spawnSync("bash", ["-c", `${mockGh}\n${run}`], {
        encoding: "utf8",
        env: {
            ...env,
            GITHUB_REPOSITORY: "StackExchange/Stacks-Editor",
            PR_NUMBER: "123",
            HEAD_SHA: "event-head",
            MOCK_PR: JSON.stringify({
                commits: commitCount,
                changed_files: changedFileCount,
            }),
            MOCK_COMMITS: JSON.stringify(commits),
            MOCK_FILES: JSON.stringify(files),
            MOCK_FINAL_HEAD: finalHead,
        },
    });
}

describe("Dependabot auto-merge workflow", () => {
    it("accepts a verified Dependabot update across paginated responses", () => {
        const result = runValidation({
            commits: [
                [dependabotCommit],
                [{ ...dependabotCommit, sha: "two" }],
            ],
            files: [
                [{ filename: "package.json" }],
                [{ filename: "package-lock.json" }],
            ],
        });

        expect(result.stderr).toBe("");
        expect(result.status).toBe(0);
    });

    const invalidCases: [string, Partial<ValidationOptions>][] = [
        [
            "a non-Dependabot commit",
            {
                commits: [
                    [
                        {
                            ...dependabotCommit,
                            author: { login: "contributor" },
                        },
                    ],
                ],
            },
        ],
        [
            "an unverified commit",
            {
                commits: [
                    [
                        {
                            ...dependabotCommit,
                            commit: { verification: { verified: false } },
                        },
                    ],
                ],
            },
        ],
        ["an unexpected file", { files: [[{ filename: "src/index.ts" }]] }],
        ["a truncated commit response", { commitCount: 2 }],
        ["a head change during validation", { finalHead: "new-head" }],
    ];

    it.each(invalidCases)("rejects %s", (_description, options) => {
        expect(runValidation(options).status).not.toBe(0);
    });

    it("binds approval and auto-merge to the evaluated head", () => {
        const validation = extractStep("Validate eligible Dependabot PR").block;
        const approval = extractStep("Approve eligible Dependabot PR").block;
        const autoMerge = extractStep(
            "Enable auto-merge for Dependabot PRs"
        ).block;
        const eligibleUpdate =
            "steps.metadata.outputs.update-type == 'version-update:semver-minor' || steps.metadata.outputs.update-type == 'version-update:semver-patch'";

        for (const step of [validation, approval, autoMerge]) {
            expect(step).toContain(eligibleUpdate);
        }
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
