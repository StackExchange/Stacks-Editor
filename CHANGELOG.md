# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
