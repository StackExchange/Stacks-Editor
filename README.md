# Stacks-Editor

Stacks-Editor is a combination rich text / markdown editor that powers Stack Overflow's post editing experience.

## Usage

### Installation

`npm install @stackoverflow/stacks-editor`

### Import via Modules or CommonJS

```html
<div id="editor-container"></div>
```

```js
import { StacksEditor } from "@stackoverflow/stacks-editor";
// don't forget to include the styles as well
import "@stackoverflow/stacks-editor/dist/styles.css";
// include the Stacks js and css as they're not included in the bundle
import "@stackoverflow/stacks";
import "@stackoverflow/stacks/dist/css/stacks.css";

new StacksEditor(
    document.querySelector("#editor-container"),
    "*Your* **markdown** here"
);
```

### Import via &lt;script&gt; tag

```html
<!--include Stacks -->
<link rel="stylesheet" href="path/to/node_modules/@stackoverflow/stacks/dist/css/stacks.css" />
<!-- include the bundled styles -->
<link
    rel="stylesheet"
    href="path/to/node_modules/@stackoverflow/stacks-editor/dist/styles.css"
/>

<div id="editor-container"></div>

<!-- highlight.js is not included in the bundle, so include it as well if you want it -->
<script src="//unpkg.com/@highlightjs/cdn-assets@latest/highlight.min.js"></script>
<!--include Stacks -->
<script src="path/to/node_modules/@stackoverflow/stacks/dist/js/stacks.min.js"></script>
<!-- include the bundle -->
<script src="path/to/node_modules/@stackoverflow/stacks-editor/dist/app.bundle.js"></script>

<!-- initialize the editor -->
<script>
    new window.stacksEditor.StacksEditor(
        document.querySelector("#editor-container"),
        "*Your* **markdown** here",
        {}
    );
</script>
```

---

## Development

1. Install dependencies with `npm i`
2. Build and start using `npm start`
3. Point your browser to the address listed in the output - typically <http://localhost:8080/>

## Run Tests

Use a Node release supported by the locked Playwright version. Install
dependencies with `npm ci` and the browser binaries with
`npx playwright install` before running browser tests.

Run all unit tests (no end-to-end tests) using

    npm run test:unit

Run all end-to-end tests (written in Playwright) using

    npm run test:e2e

End-to-end tests need to follow the convention of using `someName.e2e.test.ts` as their filename. They'll automatically get picked up by the test runner this way.

Verify the published package and release configuration using:

```sh
npm run test:package
npm run test:release-config
```

The package check builds an npm tarball, installs it in a temporary consumer,
type-checks the public imports, and bundles its JavaScript and CSS. It then
opens the consumer in Chromium and checks editing and menu styling. Consumer
installation may access npm; direct Classic, Icons, and Highlight.js versions
match the repository lockfile. A missing Chromium binary fails the check.

Menu end-to-end tests cover keyboard operation and layout in light, dark,
high-contrast, and dark high-contrast themes across all three browsers.
They save `heading-menu.png` review artifacts in `test-results/`. These are
not pixel-regression baselines or a complete accessibility audit.

## Browser Bundle analysis

Generate a `stats.json` file for analysis using

    npm run build:stats

You can upload your `stats.json` file [here](http://webpack.github.io/analyse/) or [here](https://chrisbateman.github.io/webpack-visualizer/) for visualization. See more resources [here](https://webpack.js.org/guides/code-splitting/#bundle-analysis).

## Publishing

We use [Changesets](https://github.com/changesets/changesets) to publish to npm, create GitHub Releases, and update the changelog.

- Add a changeset to pull requests that require a package release.
- The release workflow creates and updates a release pull request against `main` while changesets are pending.
- Merging the reviewed release pull request publishes the package under npm's `latest` tag and creates a GitHub Release.
- The `v0` branch preserves supported Editor 0.15.x maintenance and publishes under the separate `legacy-v0` npm tag.

_The release job runs only after lint, unit, end-to-end, packed-package, and release-configuration tests pass._

Review the generated versions, dependency ranges, changelog, and package
contents before merging the release pull request. Its merge authorizes
publication; there is no additional manual approval step in the workflow.

Continue using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for repository history.
