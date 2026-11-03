import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";

const eslint = new ESLint();

async function lint(code, filePath) {
    const [result] = await eslint.lintText(code, { filePath });
    assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
    return result.messages.map(({ ruleId }) => ruleId);
}

test("rejects unsafe DOM assignments and method calls", async () => {
    const rules = await lint(
        'const input = window.location.hash; document.body.innerHTML = input; document.body.insertAdjacentHTML("beforeend", input);',
        "src/shared/utils.ts"
    );

    assert.ok(rules.includes("no-unsanitized/property"));
    assert.ok(rules.includes("no-unsanitized/method"));
});

test("retains the prior restriction on block-scoped function declarations", async () => {
    const rules = await lint(
        "if (true) { function nested() { return 1; } nested(); }",
        "src/shared/utils.ts"
    );

    assert.ok(rules.includes("no-inner-declarations"));
});

test("keeps type-aware linting enabled", async () => {
    const rules = await lint("Promise.resolve(1);", "src/shared/utils.ts");

    assert.ok(rules.includes("@typescript-eslint/no-floating-promises"));
});

test("applies unit-test conventions only to unit tests", async () => {
    const unitRules = await lint(
        'test("works", () => { expect(1).toBe(1); });',
        "test/shared/utils.test.ts"
    );
    const e2eRules = await lint(
        'test("works", () => { expect(1).toBe(1); });',
        "test/rich-text/inputrules.e2e.test.ts"
    );

    assert.ok(unitRules.includes("jest/consistent-test-it"));
    assert.ok(!e2eRules.includes("jest/consistent-test-it"));
});

test("allows standalone Playwright assertions while checking Jest assertions", async () => {
    const unitRules = await lint(
        "expect(1).toBe(1);",
        "test/shared/utils.test.ts"
    );
    const e2eRules = await lint(
        "expect(1).toBe(1);",
        "test/rich-text/inputrules.e2e.test.ts"
    );

    assert.ok(unitRules.includes("jest/no-standalone-expect"));
    assert.ok(!e2eRules.includes("jest/no-standalone-expect"));
});

test("ignores generated output, dependencies, and build configuration", async () => {
    for (const file of [
        "dist/src/index.js",
        "node_modules/example/index.js",
        "config/webpack.common.js",
        "eslint.config.js",
    ]) {
        assert.equal(await eslint.isPathIgnored(file), true, file);
    }
});
