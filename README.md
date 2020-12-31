# Stacks-Editor

## Usage

### Installation

This package is not yet on npm. Installation is a manual only process for now.

### Import via Modules or CommonJS

```html
<div id="editor-container"></div>
```

```js
import { StacksEditor } from "@stackoverflow/stacks-editor";
// don't forget to include the styles as well
import "@stackoverflow/stacks-editor/styles.css";

new StacksEditor(
    document.querySelector("#editor-container"),
    "*Your* **markdown** here"
);
```

### Import via &lt;script&gt; tag

```html
<!-- include the bundled styles -->
<link
    rel="stylesheet"
    src="path/to/node_modules/@stackoverflow/stacks-editor/dist/styles.css"
/>

<div id="editor-container"></div>

<!-- highlight.js is not included in the bundle, so include it as well if you want it -->
<script src="//unpkg.com/@highlightjs/cdn-assets@latest/highlight.min.js"></script>

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
3. Your browser will show the example page automatically

## Run Tests

Run all unit tests (no end-to-end tests) using

    npm test

Run all end-to-end tests (written in Playwright) using

    npm run start
    npm run test:e2e

End-to-end tests need to follow the convention of using `someName.e2e.test.ts` as their filename and being saved in the `test/e2e` directory. They'll automatically get picket up by the test runner this way.

## Browser Bundle analysis

Generate a `stats.json` file for analysis using

    npm run print-stats

You can upload your `stats.json` file [here](http://webpack.github.io/analyse/) or [here](https://chrisbateman.github.io/webpack-visualizer/) for visualization. See more resources [here](https://webpack.js.org/guides/code-splitting/#bundle-analysis).
