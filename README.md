# Stacks-Editor

## Usage

### Installation

This package is not yet on npm. Installation is a manual only process for now.

### Import via one giant megascript

If you prefer your bundle to be a single, large script, use `npm run build:stackoverflow`.
This is ideal for delivering in cases where an existing script loader is present.

```html
<!-- include the bundled styles -->
<link rel="stylesheet" src="path/to/file/styles.css" />

<div id="example1"></div>

<!-- include the bundle -->
<script src="path/to/file/app.bundle.js"></script>

<!-- initialize the editor -->
<script>
    new window.stacksEditor.StacksEditor(
        document.querySelector("#example-1"),
        "*Your* **markdown** here",
        {}
    );
</script>
```

### Import via Modules or CommonJS

```html
<div id="example1"></div>
```

```js
import { StacksEditor } from "stacks-editor";

new StacksEditor(
    document.querySelector("#example-1"),
    "*Your* **markdown** here"
);
```

### Browser use via &lt;script&gt;

```html
<!-- include the bundled styles -->
<link rel="stylesheet" src="./node_modules/stacks-editor/dist/browser.css" />

<div id="example1"></div>

<!-- include the browser.bundle (not app.bundle) script for a tiny initial payload that loads the rest on demand -->
<script src="./node_modules/stacks-editor/dist/browser.bundle.js"></script>

<script>
    // set the resource path so the bundle knows where to load the rest of the bundles from
    window.stacksEditorResourcePath = "./node_modules/stacks-editor/dist/";
    // load the new editor bundle asyncronously, returns a promise containing the newly created editor instance
    window.stacksEditor
        .stacksEditorAsync(
            document.querySelector("#example-1"),
            "*Your* **markdown** here"
        )
        .then((editorInstance) => {
            console.log(
                "Editor initialized and set to view type:" +
                    editorInstance.currentViewType
            );
        });
</script>
```

### Importing async version

You can also import the async helper entry too if you want the browser style functionality:

```js
import { stacksEditorAsync } from "stacks-editor/src/browser";

// call the helper like in the browser based example
stacksEditorAsync(...).then(...);
```

---

## Development

1. Build and start using `npm run start`
    1. If you get an error message complaining that `'webpack-dev-server' is not a recognized command`, then try running `npm install -g webpack-dev-server`
2. Your browser will show the example page automatically

## Run Tests

Run all unit tests (no end-to-end tests) using

    npm test

Run all end-to-end tests (written in Playwright) using

    npm run start
    npm run test:e2e

End-to-end tests need to follow the convention of using `someName.e2e.test.ts` as their filename and being saved in the `test/e2e` directory. They'll automatically get picket up by the test runner this way.

## Browser Bundle analysis

```
npm run print-stats

OR

npm run print-stats:stackoverflow
```

You can upload your `stats.json` file [here](http://webpack.github.io/analyse/) or [here](https://chrisbateman.github.io/webpack-visualizer/) for visualization. See more resources [here](https://webpack.js.org/guides/code-splitting/#bundle-analysis).
