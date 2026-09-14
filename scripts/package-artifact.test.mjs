import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8")
);
const lock = JSON.parse(
    await readFile(new URL("../package-lock.json", import.meta.url), "utf8")
);

/** Run a consumer command with enough diagnostics to explain a CI failure. */
const run = (command, args, cwd) => {
    try {
        return execFileSync(command, args, {
            cwd,
            encoding: "utf8",
            timeout: 120_000,
            stdio: ["ignore", "pipe", "pipe"],
        });
    } catch (error) {
        throw new Error(`${error.message}\n${error.stdout}\n${error.stderr}`);
    }
};

test("installs, type-checks, bundles, and runs the published package", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "stacks-editor-package-"));
    let browser;
    let server;
    try {
        const packed = JSON.parse(
            run(
                "npm",
                [
                    "pack",
                    "--json",
                    "--ignore-scripts",
                    "--pack-destination",
                    root,
                ],
                repositoryRoot
            )
        )[0];
        const packedFiles = new Set(packed.files.map(({ path }) => path));
        const exports = Object.values(packageJson.exports).flatMap((entry) =>
            typeof entry === "string" ? [entry] : Object.values(entry)
        );
        for (const target of exports) {
            assert.ok(
                packedFiles.has(target.replace(/^\.\//, "")),
                `${target} is missing from the tarball`
            );
        }

        // Pin direct dependencies to the versions verified by this checkout.
        // The consumer has no symlinks or resolver fallback to the source tree.
        const dependencies = Object.fromEntries(
            [
                "@stackoverflow/stacks",
                "@stackoverflow/stacks-icons",
                "highlight.js",
            ].map((name) => [
                name,
                lock.packages[`node_modules/${name}`].version,
            ])
        );
        dependencies[packageJson.name] = `file:./${packed.filename}`;
        await writeFile(
            path.join(root, "package.json"),
            JSON.stringify({
                name: "stacks-editor-packed-consumer",
                private: true,
                type: "module",
                dependencies,
            })
        );
        run(
            "npm",
            [
                "install",
                "--ignore-scripts",
                "--no-audit",
                "--no-fund",
                "--prefer-offline",
            ],
            root
        );

        const imports = `
import { EditorType, StacksEditor } from "@stackoverflow/stacks-editor";
import { codeDetectionPlugin } from "@stackoverflow/stacks-editor/plugins/sample";
import { markdownLogging } from "@stackoverflow/stacks-editor/plugins/devx";
import { stackSnippetPlugin } from "@stackoverflow/stacks-editor/plugins/official";
`;
        await writeFile(
            path.join(root, "types.ts"),
            `${imports}
declare const target: HTMLElement;
const editor = new StacksEditor(target, "types", {
    defaultView: EditorType.RichText,
    editorPlugins: [codeDetectionPlugin, markdownLogging, stackSnippetPlugin()],
});
editor.content = "updated";
`
        );
        await writeFile(
            path.join(root, "tsconfig.json"),
            JSON.stringify({
                compilerOptions: {
                    target: "ES2022",
                    module: "NodeNext",
                    moduleResolution: "NodeNext",
                    strict: true,
                    skipLibCheck: true,
                    noEmit: true,
                },
                files: ["types.ts"],
            })
        );
        run(
            process.execPath,
            [
                require.resolve("typescript/bin/tsc"),
                "--project",
                "tsconfig.json",
            ],
            root
        );

        await writeFile(
            path.join(root, "consumer.js"),
            `${imports}
import "@stackoverflow/stacks/dist/css/stacks.css";
import "@stackoverflow/stacks-editor/dist/styles.css";
window.consumerPlugins = [codeDetectionPlugin, markdownLogging, stackSnippetPlugin];
window.editor = new StacksEditor(document.querySelector("#editor"), "Packed consumer smoke test", {
    defaultView: EditorType.RichText,
});
`
        );
        await writeFile(
            path.join(root, "webpack.config.cjs"),
            `
const MiniCssExtractPlugin = require(${JSON.stringify(require.resolve("mini-css-extract-plugin"))});
module.exports = {
    mode: "production",
    context: ${JSON.stringify(root)},
    entry: "./consumer.js",
    output: { path: ${JSON.stringify(path.join(root, "dist"))}, filename: "consumer.js" },
    module: { rules: [{ test: /\\.css$/, use: [MiniCssExtractPlugin.loader, ${JSON.stringify(require.resolve("css-loader"))}] }] },
    plugins: [new MiniCssExtractPlugin({ filename: "consumer.css" })],
};
`
        );
        run(
            process.execPath,
            [
                require.resolve("webpack-cli/bin/cli.js"),
                "--config",
                "webpack.config.cjs",
            ],
            root
        );
        await writeFile(
            path.join(root, "dist/index.html"),
            `<!doctype html>
<html lang="en"><head><title>Editor package consumer</title><link rel="stylesheet" href="/consumer.css"></head>
<body><main id="editor"></main><script src="/consumer.js"></script></body></html>`
        );

        const files = new Map([
            ["/", ["index.html", "text/html"]],
            ["/consumer.js", ["consumer.js", "text/javascript"]],
            ["/consumer.css", ["consumer.css", "text/css"]],
        ]);
        server = createServer(async (request, response) => {
            const file = files.get(request.url);
            if (!file) {
                response.writeHead(404).end();
                return;
            }
            try {
                response.writeHead(200, { "Content-Type": file[1] });
                response.end(await readFile(path.join(root, "dist", file[0])));
            } catch {
                response.destroy();
            }
        });
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolve);
        });
        // A missing browser must fail this release gate, never silently skip it.
        browser = await chromium.launch();
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        const editor = page.locator(".ProseMirror");
        await expect(editor).toHaveCount(1);
        await expect(editor).toHaveAttribute("contenteditable", "true");
        await expect(editor).toHaveText("Packed consumer smoke test");
        await editor.fill("Edited through the packed package");
        assert.match(
            await page.evaluate(() => window.editor.content),
            /Edited through the packed package/
        );
        const dropdown = page.locator('[id^="heading-dropdown-btn-"]');
        await dropdown.click();
        const menu = page.locator('[id^="heading-dropdown-popover-"]');
        await expect(menu).toBeVisible();
        await expect(menu.locator(".s-menu--action").first()).toHaveCSS(
            "display",
            "flex"
        );
        assert.deepEqual(errors, []);
    } finally {
        await browser?.close();
        if (server?.listening) {
            await new Promise((resolve) => server.close(resolve));
        }
        await rm(root, { recursive: true, force: true });
    }
});
