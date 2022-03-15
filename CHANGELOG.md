# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
