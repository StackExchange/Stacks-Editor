# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
