# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.9.0](https://github.com/StackExchange/Stacks-Editor/compare/v0.8.9...v0.9.0) (2023-10-06)

### ⚠ BREAKING CHANGES

* **dependencies:** This version of Stacks-Editor is updated to work with [Stacks v2](https://github.com/StackExchange/Stacks/releases/tag/v2.0.0) and [Stacks-Icons v6.0](https://github.com/StackExchange/Stacks-Icons/releases/tag/v6.0.0). Please update those dependencies if included in your projects before upgrading to Stacks-Editor v0.9.0.

### [0.8.9](https://github.com/StackExchange/Stacks-Editor/compare/v0.8.8...v0.8.9) (2023-09-22)


### Bug Fixes

* **a11y:** add menuitem role to menu buttons ([#252](https://github.com/StackExchange/Stacks-Editor/issues/252)) ([25ac29b](https://github.com/StackExchange/Stacks-Editor/commit/25ac29b51b5b55e439b560d0f2fd83c00ba187bc))
* **a11y:** make dropdown menuitems children of menu ([#255](https://github.com/StackExchange/Stacks-Editor/issues/255)) ([2409a56](https://github.com/StackExchange/Stacks-Editor/commit/2409a56343dafeaea4ece39fa7ddaf0eb2e89ca4))
* **a11y:** prevent refocus of textarea on keyboard navigation ([#254](https://github.com/StackExchange/Stacks-Editor/issues/254)) ([c86457e](https://github.com/StackExchange/Stacks-Editor/commit/c86457e70ccc1ea525acac73a2478c2858edc952))

### [0.8.8](https://github.com/StackExchange/Stacks-Editor/compare/v0.8.7...v0.8.8) (2023-06-29)


### Features

* **image-upload:** add option to show a warning in the upload panel ([#251](https://github.com/StackExchange/Stacks-Editor/issues/251)) ([220f5e7](https://github.com/StackExchange/Stacks-Editor/commit/220f5e732f10927661759354c63fcff01ceeabfc))
* **image-upload:** dispatch event for intercepting image upload flow ([#249](https://github.com/StackExchange/Stacks-Editor/issues/249)) ([a0d83c9](https://github.com/StackExchange/Stacks-Editor/commit/a0d83c99b622be4e27e14149e54a82ff08298a89))


### Bug Fixes

* **a11y:** add menuitem role to dropdown items ([f00095e](https://github.com/StackExchange/Stacks-Editor/commit/f00095e87ab39ef2b05100e98c9cb6305b9ca182))
* **a11y:** remove illegal (and superfluous) aria role from the image uploader browse label ([#246](https://github.com/StackExchange/Stacks-Editor/issues/246)) ([d388a13](https://github.com/StackExchange/Stacks-Editor/commit/d388a135c66096596fb65850f547724ff41e5086))

### [0.8.7](https://github.com/StackExchange/Stacks-Editor/compare/v0.8.6...v0.8.7) (2023-04-12)


### Bug Fixes

* **a11y:** accessible mode switcher ([#244](https://github.com/StackExchange/Stacks-Editor/issues/244)) ([e77f4af](https://github.com/StackExchange/Stacks-Editor/commit/e77f4affc9e655120c2ca1acbd8636cbc014c8d8))
* **commands:** update commonmark to select link instead of text ([608562a](https://github.com/StackExchange/Stacks-Editor/commit/608562a297f077e7547ac4315d11f61e25ef47c3))

### [0.8.6](https://github.com/StackExchange/Stacks-Editor/compare/v0.8.5...v0.8.6) (2023-03-16)


### Bug Fixes

* **commands:** update commonmark link insert to use the current origin instead of hardcoded url ([151c4a8](https://github.com/StackExchange/Stacks-Editor/commit/151c4a8609e5b9719e616fdfcc0837c3c3e285c2))
* **commonmark:** allow shift-enter command ([#241](https://github.com/StackExchange/Stacks-Editor/issues/241)) ([0e9d659](https://github.com/StackExchange/Stacks-Editor/commit/0e9d659d4416eca60b2865d76758da2c2b7b27ab))

### [0.8.5](https://github.com/StackExchange/Stacks-Editor/compare/v0.8.4...v0.8.5) (2023-02-09)


### Features

* **menu:** place code block and inline code menu buttons side by side ([#237](https://github.com/StackExchange/Stacks-Editor/issues/237)) ([e526265](https://github.com/StackExchange/Stacks-Editor/commit/e526265b9ec795891cc55122c4d96e7a6164e239))

### [0.8.4](https://github.com/StackExchange/Stacks-Editor/compare/v0.8.3...v0.8.4) (2023-01-11)


### Features

* **bindings:** add Cmd/Ctrl+Shift+Z hot key for history redo ([#227](https://github.com/StackExchange/Stacks-Editor/issues/227)) ([e5ac816](https://github.com/StackExchange/Stacks-Editor/commit/e5ac816cc8444cffd4a3ad2d6e0b9693703acf3c)), closes [#187](https://github.com/StackExchange/Stacks-Editor/issues/187)

### [0.8.3](https://github.com/StackExchange/Stacks-Editor/compare/v0.8.2...v0.8.3) (2022-12-12)


### Features

* **code-paste-handler:** remove support for auto-fencing pasted code in markdown mode ([008d0f3](https://github.com/StackExchange/Stacks-Editor/commit/008d0f3796e405ce6d1a065e39146979c8ae5b28)), closes [#230](https://github.com/StackExchange/Stacks-Editor/issues/230)

### [0.8.2](https://github.com/StackExchange/Stacks-Editor/compare/v0.8.1...v0.8.2) (2022-10-20)


### Features

* **tag-link:** add TagLinkOptions.disableMetaTags option ([eec8fef](https://github.com/StackExchange/Stacks-Editor/commit/eec8fefed0bb57e209c7fda95e2452a36c1a4bb3)), closes [#226](https://github.com/StackExchange/Stacks-Editor/issues/226)


### Bug Fixes

* **menu:** ensure consistent y padding for all dropdown menus ([150363e](https://github.com/StackExchange/Stacks-Editor/commit/150363ea67eb3dde507e952b8e9d059197ab08b6))

### [0.8.1](https://github.com/StackExchange/Stacks-Editor/compare/v0.8.0...v0.8.1) (2022-09-28)


### Features

* **a11y:** add `aria-multiline` and `role` attributes to contenteditable element ([a363120](https://github.com/StackExchange/Stacks-Editor/commit/a3631201099c528b3995fed1df34577b96b042fe))
* **options:** add new `elementAttributes` option for setting arbitrary attributes onto the target ([8220dd6](https://github.com/StackExchange/Stacks-Editor/commit/8220dd6a3a317578b574a800f8b3dfbb65a0beb4))


### Bug Fixes

* **commands:** be more context aware when inserting a horizontal rule to avoid creating a heading ([a15551b](https://github.com/StackExchange/Stacks-Editor/commit/a15551b65e7f64d4e6c0eebb1209e196223228ee)), closes [#192](https://github.com/StackExchange/Stacks-Editor/issues/192)

## [0.8.0](https://github.com/StackExchange/Stacks-Editor/compare/v0.7.1...v0.8.0) (2022-09-14)


### ⚠ BREAKING CHANGES

* **preview:** changed type of CommonmarkOptions.preview.renderer from a MarkdownIt instance to
an arbitrary rendering function; removed default preview renderer in favor of always requiring a
renderer method when enabled

### Features

* **preview:** update markdown preview renderer to support an arbitrary renderer callback ([13bc4df](https://github.com/StackExchange/Stacks-Editor/commit/13bc4df8b3e9d2781faf801d46511578cb38b5a9))


### Bug Fixes

* **interface-manager:** partial fix for race condition causing multiple buildInterface calls ([1353dab](https://github.com/StackExchange/Stacks-Editor/commit/1353dab70403271928ba005536f00d561b379f58))
* **link-editor:** fix link-editor dispatching on blur when not shown ([8785030](https://github.com/StackExchange/Stacks-Editor/commit/8785030ec45c37a17d68d11922bc1a0eee858551))
* **stacks-editor:** fix mode toggle when preview is disabled and `shownByDefault` is enabled ([149f67f](https://github.com/StackExchange/Stacks-Editor/commit/149f67f3646aa027168cd3a4fd5b4f54ed7db20c))

### [0.7.1](https://github.com/StackExchange/Stacks-Editor/compare/v0.7.0...v0.7.1) (2022-08-30)


### Features

* **commonmark-editor:** add "more formatting" menu dropdown to match that in the rich-text editor ([e20b8f2](https://github.com/StackExchange/Stacks-Editor/commit/e20b8f2ac017f404e6bca906d42c7edce93888f6))
* **menu:** show undo/redo buttons on devices that need a virtual keyboard ([15360bb](https://github.com/StackExchange/Stacks-Editor/commit/15360bbde8e28ea46c77f7427bd555414d7a1049)), closes [#210](https://github.com/StackExchange/Stacks-Editor/issues/210)
* **preview:** add additional mode toggle when commonmarkOptions.preview is enabled ([#217](https://github.com/StackExchange/Stacks-Editor/issues/217)) ([e664128](https://github.com/StackExchange/Stacks-Editor/commit/e664128f0d7ab4e3a9d9ee2445631587c724f6dc)), closes [#150](https://github.com/StackExchange/Stacks-Editor/issues/150)
* **reference-link:** add reference link syntax support for images ([d6efe2b](https://github.com/StackExchange/Stacks-Editor/commit/d6efe2ba0a34480723a46734673eb4f4ed72bc1f)), closes [#188](https://github.com/StackExchange/Stacks-Editor/issues/188)
* **rich-text-editor:** add code_block (un)indent (shift-)tab shortcuts ([#137](https://github.com/StackExchange/Stacks-Editor/issues/137)) ([d3e7624](https://github.com/StackExchange/Stacks-Editor/commit/d3e762464a9641a8eb2d51fdd185052a6810c585)), closes [#50](https://github.com/StackExchange/Stacks-Editor/issues/50)
* **rich-text-editor:** add rich-text tagLink, sub, sup, kbd, and spoiler entries/shortcuts ([#158](https://github.com/StackExchange/Stacks-Editor/issues/158)) ([4936bbe](https://github.com/StackExchange/Stacks-Editor/commit/4936bbe53d3c72b88332d21f49c704774add046e)), closes [#51](https://github.com/StackExchange/Stacks-Editor/issues/51)


### Bug Fixes

* **html:** fix newlines in-between html attributes breaking tag markup parsing ([6634898](https://github.com/StackExchange/Stacks-Editor/commit/66348988d5307d44fe91daf1888dc0c042b31445)), closes [#208](https://github.com/StackExchange/Stacks-Editor/issues/208)
* **markdown-serializer:** ease up on over stringent escaping in link urls ([33527f6](https://github.com/StackExchange/Stacks-Editor/commit/33527f6e8a2fc88bc83a300a69dbb1b0127a3adc)), closes [#218](https://github.com/StackExchange/Stacks-Editor/issues/218)
* **menu:** change to not mess with a block's classes if the visibility function is missing entirely ([6c62c04](https://github.com/StackExchange/Stacks-Editor/commit/6c62c04a53891b09fefd6dbb3c11831d6614f232))
* **menu:** fix undo/redo buttons not working, along with ensuring that the state is properly updated ([bb686fb](https://github.com/StackExchange/Stacks-Editor/commit/bb686fb8a80b1ed8182970c8dbbce34bcc4c8b90)), closes [#172](https://github.com/StackExchange/Stacks-Editor/issues/172) [#214](https://github.com/StackExchange/Stacks-Editor/issues/214)

## [0.7.0](https://github.com/StackExchange/Stacks-Editor/compare/v0.6.1...v0.7.0) (2022-07-28)


### ⚠ BREAKING CHANGES

* **tag-link:** TagLinkOptions.allowNonAscii and TagLinkOptions.allowMetaTags have been removed in
favor of the consumer handling all validation using the new TagLinkOptions.validate option
TagLinkOptions.renderer has been renamed to TagLinkOptions.render

### Features

* **commands:** change all shortcut labels to use capital letters ([#204](https://github.com/StackExchange/Stacks-Editor/issues/204)) ([0bc5c65](https://github.com/StackExchange/Stacks-Editor/commit/0bc5c65a51b5626889de24366fe5e3725f511e69)), closes [#166](https://github.com/StackExchange/Stacks-Editor/issues/166)
* **commonmark-editor:** move commonmark syntax highlighting to a new Lezer based system ([#176](https://github.com/StackExchange/Stacks-Editor/issues/176)) ([693a402](https://github.com/StackExchange/Stacks-Editor/commit/693a4024df413e75d36e4975c5db5d8ab3b9551b)), closes [#21](https://github.com/StackExchange/Stacks-Editor/issues/21)
* **link-editor:** open link on Mod-Click ([#130](https://github.com/StackExchange/Stacks-Editor/issues/130)) ([ea8da4b](https://github.com/StackExchange/Stacks-Editor/commit/ea8da4b109c93094079109e4b052d42f1621a560)), closes [#62](https://github.com/StackExchange/Stacks-Editor/issues/62)
* **markdown-serializer:** prefer sorting numeric link references in number order ([20f338a](https://github.com/StackExchange/Stacks-Editor/commit/20f338abea66dcaedc1157adb2cb91b223869bb5)), closes [#163](https://github.com/StackExchange/Stacks-Editor/issues/163)
* **markdown-serializer:** serialize code_block nodes to use fences by default ([f658969](https://github.com/StackExchange/Stacks-Editor/commit/f6589698ebc934edc8bf3ebcdbfac94e6d179e29)), closes [#168](https://github.com/StackExchange/Stacks-Editor/issues/168)
* **menu:** tweak active/selected button styling ([303e494](https://github.com/StackExchange/Stacks-Editor/commit/303e494ed5dc8de406f456f49884bb945066d084))
* **stacks-editor:** change the mode toggle to a radio powered button group instead of a checkbox ([2df7f00](https://github.com/StackExchange/Stacks-Editor/commit/2df7f00ea404297bed7976b4f9501a0bc9376854))
* **tag-link:** add all-purpose TagLinkOptions.validate function ([6ae6936](https://github.com/StackExchange/Stacks-Editor/commit/6ae693694c08be9afbad7f0668e0043ec747cef2))


### Bug Fixes

* **code-paste-handler:** fix "global is not defined" error when compiling with Vite ([b7aaf5c](https://github.com/StackExchange/Stacks-Editor/commit/b7aaf5c85e7c4ae75aed58b2aecc8bc7c263da05)), closes [#159](https://github.com/StackExchange/Stacks-Editor/issues/159)
* **image-upload:** dropped/pasted images now properly load into the image uploader ([0bf0bdf](https://github.com/StackExchange/Stacks-Editor/commit/0bf0bdf1d4925f59a28a54b46527151aefb26cd8)), closes [#167](https://github.com/StackExchange/Stacks-Editor/issues/167)
* **image-upload:** improve image-upload pane layout on small viewport widths ([c47728a](https://github.com/StackExchange/Stacks-Editor/commit/c47728aaf514d89f3c92d29137b451f58c2c1d9b)), closes [#202](https://github.com/StackExchange/Stacks-Editor/issues/202)
* **markdown-serializer:** fix incorrect newline serialization of html_inline and html_block ([664e034](https://github.com/StackExchange/Stacks-Editor/commit/664e034dc39a3ec40fb95e31ba07c925ecbce9cf)), closes [#152](https://github.com/StackExchange/Stacks-Editor/issues/152)
* **menu:** fix crashes when a menu entry is null ([87063b9](https://github.com/StackExchange/Stacks-Editor/commit/87063b920f3f092f61ccdfbc98a76f7a2c839331))
* **rich-text-editor:** allow any block node inside list items ([#157](https://github.com/StackExchange/Stacks-Editor/issues/157)) ([f59b72f](https://github.com/StackExchange/Stacks-Editor/commit/f59b72f763d0880ff3c644e80caf98b8e14dfe8d)), closes [#63](https://github.com/StackExchange/Stacks-Editor/issues/63)

### [0.6.1](https://github.com/StackExchange/Stacks-Editor/compare/v0.6.0...v0.6.1) (2022-07-05)


### Bug Fixes

* **options:** fix crash on startup when `preview` option is unset ([c692e17](https://github.com/StackExchange/Stacks-Editor/commit/c692e17aaa26ad0a1a7626f33617a2f9f4ac88ed)), closes [#149](https://github.com/StackExchange/Stacks-Editor/issues/149)

## [0.6.0](https://github.com/StackExchange/Stacks-Editor/compare/v0.5.1...v0.6.0) (2022-07-01)


### Features

* **commonmark-editor:** add basic static markdown preview support ([#146](https://github.com/StackExchange/Stacks-Editor/issues/146)) ([bb9f862](https://github.com/StackExchange/Stacks-Editor/commit/bb9f8626648109e2187626a17ed85e807fb43956)), closes [#115](https://github.com/StackExchange/Stacks-Editor/issues/115)
* **commonmark-editor:** change copy behavior of commonmark content to be plain text instead of code ([485855d](https://github.com/StackExchange/Stacks-Editor/commit/485855db6ee8cda48f267a48cbaf6da2f4cde5b8))
* **commonmark-editor:** detect and format pasted code like rich-text mode ([#147](https://github.com/StackExchange/Stacks-Editor/issues/147)) ([9d9841a](https://github.com/StackExchange/Stacks-Editor/commit/9d9841a9ee4dff30d7bc19196095c16517ed50e8)), closes [#135](https://github.com/StackExchange/Stacks-Editor/issues/135)
* **editor-plugin:** add external plugin support ([#141](https://github.com/StackExchange/Stacks-Editor/issues/141)) ([aca011f](https://github.com/StackExchange/Stacks-Editor/commit/aca011f58d48c35bdf836ac9ff5f29f8af84eaf7))
* **link-editor:** change link editor from a popover to a plugin pane ([#142](https://github.com/StackExchange/Stacks-Editor/issues/142)) ([3e4c847](https://github.com/StackExchange/Stacks-Editor/commit/3e4c84777c9ace43c2a83494a6071f6ceae389a6)), closes [#19](https://github.com/StackExchange/Stacks-Editor/issues/19)


### Bug Fixes

* **commonmark-editor:** fix commonmark editor treating all pasted html content as code ([6dc4556](https://github.com/StackExchange/Stacks-Editor/commit/6dc4556353fea70b340986381e58381c0ddaa105))
* **commonmark-editor:** only select current paragraph on triple click ([#128](https://github.com/StackExchange/Stacks-Editor/issues/128)) ([7f1fa6c](https://github.com/StackExchange/Stacks-Editor/commit/7f1fa6cbeb12bf1a0ac2c9f476d82b6c5fe1b871)), closes [#27](https://github.com/StackExchange/Stacks-Editor/issues/27)
* **commonmark-editor:** prevent placeholder clipping ([#144](https://github.com/StackExchange/Stacks-Editor/issues/144)) ([a3d0669](https://github.com/StackExchange/Stacks-Editor/commit/a3d0669a01d702c5c08e198ca80690a16f720f57))

### [0.5.1](https://github.com/StackExchange/Stacks-Editor/compare/v0.5.0...v0.5.1) (2022-06-16)


### Features

* **image-upload:** add `imageUpload.allowExternalUrls` option to allow uploads from external urls ([4b994d5](https://github.com/StackExchange/Stacks-Editor/commit/4b994d50650e7252428ec2e928dcb709ead22268)), closes [#43](https://github.com/StackExchange/Stacks-Editor/issues/43)
* **image-upload:** add `imageUpload.embedImagesAsLinks` setting support ([d778070](https://github.com/StackExchange/Stacks-Editor/commit/d77807027fe1eda8f718fe4c5a4271ecc5ee58f6)), closes [#61](https://github.com/StackExchange/Stacks-Editor/issues/61)
* **menu:** add keyboard shortcut labels to tooltips ([#127](https://github.com/StackExchange/Stacks-Editor/issues/127)) ([90d427a](https://github.com/StackExchange/Stacks-Editor/commit/90d427a8959795859fad08e7d132378193c69b02)), closes [#46](https://github.com/StackExchange/Stacks-Editor/issues/46)
* **plugins:** add new interface-manager plugin to coordinate different plugins' interfaces ([166b486](https://github.com/StackExchange/Stacks-Editor/commit/166b4861cb2debbedab9c9dda7d4b13d87e3034e))
* **plugins:** add placeholder to empty input ([#116](https://github.com/StackExchange/Stacks-Editor/issues/116)) ([da2963e](https://github.com/StackExchange/Stacks-Editor/commit/da2963e77c2a1512ab21bb9f44bdad4860b9cc6e)), closes [#103](https://github.com/StackExchange/Stacks-Editor/issues/103)
* **rich-text-editor:** cycle heading levels on keyboard shortcut ([#131](https://github.com/StackExchange/Stacks-Editor/issues/131)) ([3be01a0](https://github.com/StackExchange/Stacks-Editor/commit/3be01a0fff4fa41ac6580aa234f965e7fa7199b9)), closes [#45](https://github.com/StackExchange/Stacks-Editor/issues/45)


### Bug Fixes

* **commonmark-editor:** prevent block change from stripping numbers ([#140](https://github.com/StackExchange/Stacks-Editor/issues/140)) ([1c18a0b](https://github.com/StackExchange/Stacks-Editor/commit/1c18a0b36febdc306aeb4c186d64722ee6f54e5f)), closes [#69](https://github.com/StackExchange/Stacks-Editor/issues/69)
* **html:** only parse inline html tags if the opening and closing tags are on the same line ([383c6db](https://github.com/StackExchange/Stacks-Editor/commit/383c6db921542e86fdd46c46322302b57f7c6698)), closes [#133](https://github.com/StackExchange/Stacks-Editor/issues/133)
* **image-upload:** improve image uploader i18n support ([b8e5730](https://github.com/StackExchange/Stacks-Editor/commit/b8e57304907fd240e9760ec524d0dada0038f38a))

## [0.5.0](https://github.com/StackExchange/Stacks-Editor/compare/v0.4.2...v0.5.0) (2022-05-13)


### ⚠ BREAKING CHANGES

* Stacks 1.0 contains breaking changes

### Features

* add basic description list (`<dl>`, `<dd>`, `<dt>`) support ([4ec9f36](https://github.com/StackExchange/Stacks-Editor/commit/4ec9f36af16c0c069c901b676ae70f8c459ed457))
* add heading dropdown menu ([0f1a096](https://github.com/StackExchange/Stacks-Editor/commit/0f1a096ecfb5805d82f300397a4379bd63b19e5c)), closes [#5](https://github.com/StackExchange/Stacks-Editor/issues/5)
* add localization support ([e9ae75e](https://github.com/StackExchange/Stacks-Editor/commit/e9ae75e5af799410e99a0bd13587f9a863373509)), closes [#60](https://github.com/StackExchange/Stacks-Editor/issues/60)
* add mod+e keybinding to insert tables ([#8](https://github.com/StackExchange/Stacks-Editor/issues/8)) ([d3c6975](https://github.com/StackExchange/Stacks-Editor/commit/d3c69756c4bf3ba560dc7575c18a5d33d3d97559))
* add text only link preview support ([#94](https://github.com/StackExchange/Stacks-Editor/issues/94)) ([a49d73c](https://github.com/StackExchange/Stacks-Editor/commit/a49d73ce262d37c5ff7f40627f6879d8396ed7e8))
* allow users to exit certain marks and code blocks by using the arrow keys ([e37a959](https://github.com/StackExchange/Stacks-Editor/commit/e37a959bf21949792bcedac249f3f60ced66daee)), closes [#64](https://github.com/StackExchange/Stacks-Editor/issues/64)


### Bug Fixes

* allow headings to contain any inline nodes, such as soft/hard line breaks ([e709127](https://github.com/StackExchange/Stacks-Editor/commit/e709127915aaf28db9c14e29ed408516e859aa5a)), closes [#107](https://github.com/StackExchange/Stacks-Editor/issues/107)
* allow unformatted text to inherit formatting when pasted into formatted content ([6254acf](https://github.com/StackExchange/Stacks-Editor/commit/6254acf01187e045ebe8f5272f42b0b31f9233de)), closes [#48](https://github.com/StackExchange/Stacks-Editor/issues/48)
* backslash escaped hardbreaks now detect and serialize correctly ([1bbbb89](https://github.com/StackExchange/Stacks-Editor/commit/1bbbb8980c1c5804fa8dae9bd973dfaed23950d3))
* change editor target to display: flex so the inner editor grows when resized ([9be120f](https://github.com/StackExchange/Stacks-Editor/commit/9be120f3e441ee312cf91a668d9c912c1a1d1df8)), closes [#88](https://github.com/StackExchange/Stacks-Editor/issues/88)
* change mod+a to only select markdown text, excluding the root node itself ([d3598f5](https://github.com/StackExchange/Stacks-Editor/commit/d3598f5469809fdc33e44cd7e1ef0845712c810c)), closes [#24](https://github.com/StackExchange/Stacks-Editor/issues/24)
* disallow any marks or nodes inside code_blocks ([439bed6](https://github.com/StackExchange/Stacks-Editor/commit/439bed63480ae54b6f4de64e053e551557873b48)), closes [#39](https://github.com/StackExchange/Stacks-Editor/issues/39)
* ensure all generated element ids are unique to prevent clashes with multiple editors ([#118](https://github.com/StackExchange/Stacks-Editor/issues/118)) ([859f315](https://github.com/StackExchange/Stacks-Editor/commit/859f31567c7d1cd77b2d28cf44021ddcbf331238))
* fix `global` runtime crashes when bundling as an es6 module ([1d2e7f1](https://github.com/StackExchange/Stacks-Editor/commit/1d2e7f137d0c527d7cd6bedf87c819c7ad97ad0c)), closes [#108](https://github.com/StackExchange/Stacks-Editor/issues/108)
* fix table serialization having incorrect trailing whitespace ([5a4c9b0](https://github.com/StackExchange/Stacks-Editor/commit/5a4c9b03b141e0c06fd3a90923bc4daaae102422))
* increase button contrast in high contrast mode ([#123](https://github.com/StackExchange/Stacks-Editor/issues/123)) ([f769642](https://github.com/StackExchange/Stacks-Editor/commit/f76964204fad900f4ca507f65e75eda4b2926d7c)), closes [#86](https://github.com/StackExchange/Stacks-Editor/issues/86)
* link preview decorations not showing on the correct node ([16cfde3](https://github.com/StackExchange/Stacks-Editor/commit/16cfde310ed52d666cf0f117e5f05732fedc3459)), closes [#37](https://github.com/StackExchange/Stacks-Editor/issues/37)
* on horizontal_rule insert, append and prepend paragraph nodes as needed ([#124](https://github.com/StackExchange/Stacks-Editor/issues/124)) ([bda2637](https://github.com/StackExchange/Stacks-Editor/commit/bda2637d829af966af5f8651e379e9809db3d8fa)), closes [#26](https://github.com/StackExchange/Stacks-Editor/issues/26)
* toggle heading only when same level ([#125](https://github.com/StackExchange/Stacks-Editor/issues/125)) ([7b5b5c1](https://github.com/StackExchange/Stacks-Editor/commit/7b5b5c1311a64edeba5d0a8ef513cfa3d8095541)), closes [#105](https://github.com/StackExchange/Stacks-Editor/issues/105)
* treat images as inline ([#121](https://github.com/StackExchange/Stacks-Editor/issues/121)) ([00cd3ea](https://github.com/StackExchange/Stacks-Editor/commit/00cd3ea86f722333653613fc5bde87f259564cfe)), closes [#53](https://github.com/StackExchange/Stacks-Editor/issues/53)
* update all keybinds to work with capslock turned on ([27a785a](https://github.com/StackExchange/Stacks-Editor/commit/27a785a50a761189ba6c39648c8c634a5ccd711c)), closes [#90](https://github.com/StackExchange/Stacks-Editor/issues/90)
* update to Stacks 1.0.1 ([#117](https://github.com/StackExchange/Stacks-Editor/issues/117)) ([b7b44bc](https://github.com/StackExchange/Stacks-Editor/commit/b7b44bc8323f443a97b8856e9b8f3b4d84af8d86))

### [0.4.2](https://github.com/StackExchange/Stacks-Editor/compare/v0.4.1...v0.4.2) (2022-03-04)


### Features

* add ability to pass custom validateLink method to parser ([124762a](https://github.com/StackExchange/Stacks-Editor/commit/124762a6b1025056793c12eb423b6a77a9a0bfe8))
* add deserialization support for reference links ([22e84dd](https://github.com/StackExchange/Stacks-Editor/commit/22e84dd43b1fb8f9779fe026529b574f1eba0779)), closes [#29](https://github.com/StackExchange/Stacks-Editor/issues/29)
* add StacksEditor:image-uploader-show event ([a9ac79c](https://github.com/StackExchange/Stacks-Editor/commit/a9ac79ca632300ff613a1a3e97f4318cfea551bd))


### Bug Fixes

* add aria-labels to icon-only buttons ([#98](https://github.com/StackExchange/Stacks-Editor/issues/98)) ([b69c3e0](https://github.com/StackExchange/Stacks-Editor/commit/b69c3e053d6085185c4b8fff5f8ddce5167583cc))
* add html render support for hard breaks/br tags ([a360b6d](https://github.com/StackExchange/Stacks-Editor/commit/a360b6dd064e1b86f9274a631a9a2ed72bee98bb))
* add missing import reference for _stacks-mixins ([#94](https://github.com/StackExchange/Stacks-Editor/issues/94)) ([af1c6c5](https://github.com/StackExchange/Stacks-Editor/commit/af1c6c51609d25ddbc7bf719e8e5df7977d2b74a))
* add not-allowed cursor to the disabled editor ([#100](https://github.com/StackExchange/Stacks-Editor/issues/100)) ([1933f6f](https://github.com/StackExchange/Stacks-Editor/commit/1933f6f9048539260693b5650c17246e155d4f0f))
* always add a paragraph to the end of the doc when inserting a block element at the end ([2df6573](https://github.com/StackExchange/Stacks-Editor/commit/2df657364742e6331157e909fb3bd19ec0570a1b)), closes [#18](https://github.com/StackExchange/Stacks-Editor/issues/18)
* fix table insertion in the middle of text incorrectly adding trailing paragraph ([84fc550](https://github.com/StackExchange/Stacks-Editor/commit/84fc550b2d3073c7272a20beac3674990d1e80fb))
* fix table menu entry always manipulating the menu icon of the last initialized editor instance ([cc592c1](https://github.com/StackExchange/Stacks-Editor/commit/cc592c184106e19f8111264ce03bfebf9da71694))
* **markdown-parser:** do not autolink emails without the "mailto:" prefix ([#85](https://github.com/StackExchange/Stacks-Editor/issues/85)) ([1a8b6cc](https://github.com/StackExchange/Stacks-Editor/commit/1a8b6ccc1aba9fc264cae4d38bf6afc66bed18fd))
* add support for serializing node attributes to html ([0a00644](https://github.com/StackExchange/Stacks-Editor/commit/0a00644b246f6e3521517850fbe15a7ea6d0e9d0))
* render html versions of blockquote, p and header tags back to markdown ([746743e](https://github.com/StackExchange/Stacks-Editor/commit/746743e2f30d0b0f375dc1aa9de906546675a5fc))

### [0.4.1](https://github.com/StackExchange/Stacks-Editor/compare/v0.4.0...v0.4.1) (2021-07-14)


### Bug Fixes

* fix Safari crashing due to unsupported use of regex negative lookbehind ([2feb3b4](https://github.com/StackExchange/Stacks-Editor/commit/2feb3b4d2fbf485d3328bc56bea6990d93fdd024))

## [0.4.0](https://github.com/StackExchange/Stacks-Editor/compare/v0.3.0...v0.4.0) (2021-07-13)

### Features

-   add support for mark (em, strong, code, link) input rules ([#2](https://github.com/StackExchange/Stacks-Editor/issues/2)) ([4814922](https://github.com/StackExchange/Stacks-Editor/commit/481492297f680472c51e57c981f050133681edc6))
-   automatically format URLs as links on paste in Rich Text mode ([#72](https://github.com/StackExchange/Stacks-Editor/issues/72)) ([064ce83](https://github.com/StackExchange/Stacks-Editor/commit/064ce8329223ae7e16693302e4757e378077d198)), closes [#33](https://github.com/StackExchange/Stacks-Editor/issues/33)

### Bug Fixes

-   clean up image-upload placeholder design ([12c36c2](https://github.com/StackExchange/Stacks-Editor/commit/12c36c28c6c8bea242e271987c28b4156247ee66))
-   **deserialization:** ensure that bare urls written in markdown reserialize with correct escaping ([f1c0602](https://github.com/StackExchange/Stacks-Editor/commit/f1c0602263dd04162197ea70da2004db7bdef52d))

## 0.3.0 (2021-06-08)

### ⚠ BREAKING CHANGES

-   **dependencies:** bumps highlight.js peerDependency to breaking 11.0.x

### Bug Fixes

-   **rich-text:** add the "Reveal spoiler" text for hidden spoilers ([#73](https://github.com/StackExchange/Stacks-Editor/issues/73)) ([cb0b699](https://github.com/StackExchange/Stacks-Editor/commit/cb0b6992701d9ce935fbc0689a5c2313099ec0c1)), closes [#30](https://github.com/StackExchange/Stacks-Editor/issues/30)
-   **serialization:** escape <> characters when serializing to markdown ([3d016bc](https://github.com/StackExchange/Stacks-Editor/commit/3d016bc1a2c1c9df6570609492f47d0cb3ca1ff4))

-   **dependencies:** update prosemirror-highlightjs dependency ([097b298](https://github.com/StackExchange/Stacks-Editor/commit/097b2988652f23fa8afa8e048c341d33214c28e1))
