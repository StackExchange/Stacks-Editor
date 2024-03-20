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

## Creating a new release

First, bump the package version and push the commit + tags:

```
> npm run release
> git push --follow-tags
```

Next, publish the package (this will run the build step before publishing):

```
> npm publish
```

Afterwards, create a GitHub release with the new content from `CHANGELOG.md`.
