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

Run all unit tests (no end-to-end tests) using

    npm run test:unit

Run all end-to-end tests (written in Playwright) using

    npm run test:e2e

End-to-end tests need to follow the convention of using `someName.e2e.test.ts` as their filename. They'll automatically get picked up by the test runner this way.

## Browser Bundle analysis

Generate a `stats.json` file for analysis using

    npm run build:stats

You can upload your `stats.json` file [here](http://webpack.github.io/analyse/) or [here](https://chrisbateman.github.io/webpack-visualizer/) for visualization. See more resources [here](https://webpack.js.org/guides/code-splitting/#bundle-analysis).

## Publishing

We use [changesets](https://github.com/changesets/changesets) to automatize the steps necessary to publish to NPM, create GH releases and a changelog.

- Every time you do work that requires a new release to be published, [add a changesets entry](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md) by running `npx @changesets/cli` and follow the instructions on screen. (changes that do not require a new release - e.g. changing a test file - don't need a changeset).
    - When opening a PR without a corresponding changeset the [changesets-bot](https://github.com/apps/changeset-bot) will remind you to do so. It generally makes sense to have one changeset for PR (if the PR changes do not require a new release to be published the bot message can be safely ignored)
- The [release github workflow](.github/workflows/release.yml) continuously check if there are new pending changesets in the main branch, if there are it creates a GH PR (`chore(release)` [see example](https://github.com/StackExchange/apca-check/pull/2)) and continue updating it as more changesets are potentially pushed/merged to the main branch.
- When we are ready to cut a release we need to simply merge the `chore(release)` PR back to main and the release github workflow will take care of publishing the changes to NPM and create a GH release for us. The `chore(release)` PR also give us an opportunity to adjust the automatically generated changelog when necessary (the entry in the changelog file is also what will end up in the GH release notes).

_The release github workflow only run if the CI workflow (running linter, formatter and tests) is successful: CI is blocking accidental releases_.

_Despite using changesets to communicate the intent of creating releases in a more explicit way, we still follow [conventional commits standards](https://www.conventionalcommits.org/en/v1.0.0/) for keeping our git history easily parseable by the human eye._
