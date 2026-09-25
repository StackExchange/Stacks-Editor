# Stacks-Editor

Stacks-Editor is a combination rich text / markdown editor that powers Stack Overflow's post editing experience.

## Usage

### Installation

Editor 1.x requires **Stacks Classic 3** (`@stackoverflow/stacks@^3.0.0`)
and declares `highlight.js@^11.6.0` as a peer dependency. Install them together:

```sh
npm install @stackoverflow/stacks-editor@^1.0.0 @stackoverflow/stacks@^3.0.0 highlight.js@^11.6.0
```

Classic 2 and beta Classic releases are not supported by Editor 1.x. Applications
using Classic 2 should install Editor with the `^0.15.0` version range instead of
`^1.0.0` or `latest`.

Editor intentionally depends on stable Stacks Icons V6. npm installs it
automatically; a separate Icons installation or upgrade to V7 is not required.

### Import via Modules or CommonJS

```html
<div id="editor-container"></div>
```

```js
import { StacksEditor } from "@stackoverflow/stacks-editor";
// don't forget to include the styles as well
import "@stackoverflow/stacks-editor/dist/styles.css";
// include the Classic styles as they're not included in the Editor styles
import "@stackoverflow/stacks/dist/css/stacks.css";

new StacksEditor(
    document.querySelector("#editor-container"),
    "*Your* **markdown** here"
);
```

### Import via &lt;script&gt; tag

Load Classic CSS and Editor CSS separately. The Editor bundle includes the Stacks
JavaScript it uses; load Classic JavaScript separately only if your page needs it
for other Stacks components.

```html
<!--include Stacks -->
<link rel="stylesheet" href="path/to/node_modules/@stackoverflow/stacks/dist/css/stacks.css" />
<!-- include the bundled styles -->
<link
    rel="stylesheet"
    href="path/to/node_modules/@stackoverflow/stacks-editor/dist/styles.css"
/>

<div id="editor-container"></div>

<!-- Optional: enables code-block syntax highlighting with Highlight.js 11 -->
<script src="https://unpkg.com/@highlightjs/cdn-assets@11/highlight.min.js"></script>
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

Use the current Node LTS release. Install dependencies with `npm ci` and the
browser binaries with `npx playwright install` before running browser tests.

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

## Documentation hosting

Documentation hostnames follow the **Editor** major version, not the Stacks
Classic major version:

| Domain | Branch | Editor version | Classic compatibility |
| --- | --- | --- | --- |
| `editor.stackoverflow.design` | `main` | 1.x | Classic 3 |
| `v0.editor.stackoverflow.design` | `v0` | 0.15.x | Classic 2 |

Netlify manages the build settings and the `v0` branch subdomain. The `v0` branch
supersedes the earlier `v2` branch for legacy maintenance and documentation. Its
name reflects Editor's own major version; the old name referred to Classic 2.

The beta-host redirect is defined in `netlify.toml`. It redirects only
`beta.editor.stackoverflow.design` to the current host, preserving paths and
query parameters. It does not redirect the current site, legacy site, or deploy
previews.

To complete the beta-host cutover:

1. Deploy the redirect configuration from `main` and verify the current and `v0`
   sites before changing domain assignments.
2. Remove `beta` from Netlify's branch subdomains, then add
   `beta.editor.stackoverflow.design` as a production domain alias. The rules in
   `main` do not apply while that hostname still serves the separate beta branch.
3. Verify HTTPS and permanent redirects for the root and demo routes, including
   URLs with query parameters. Confirm that the destination editors still work.
4. Remove `beta` and `v2` from the branch-deploy allowlist, retaining `v0`.
   Branch-deploy settings are separate from Git branches; do not delete branches
   as part of this hosting change.

## Publishing

We use [Changesets](https://github.com/changesets/changesets) to publish to npm, create GitHub Releases, and update the changelog.

- Add a changeset to pull requests that require a package release.
- The release workflow creates and updates a release pull request against `main` while changesets are pending.
- Merging the reviewed release pull request publishes the package under npm's `latest` tag and creates a GitHub Release.
- The `v0` branch is configured for Editor 0.15.x maintenance releases under the separate `legacy-v0` npm tag, without replacing `latest` or creating GitHub Releases. That tag is created when a maintenance release is published; use an explicit `0.15.x` version range until then.

_The release job runs only after lint, unit, end-to-end, packed-package, and release-configuration tests pass._

Review the generated versions, dependency ranges, changelog, and package
contents before merging the release pull request. Its merge authorizes
publication; there is no additional manual approval step in the workflow.

When exiting prerelease mode, remove consumed changesets from both `.changeset/`
and `.changeset/pre/`. Changesets 3 reads the latter directory as release input,
so it must not be used to archive changesets from completed releases.

Continue using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for repository history.
