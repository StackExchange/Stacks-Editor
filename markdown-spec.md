# Stack-Flavored Markdown

This is an overview of the Markdown features we support on Stack Overflow.

## Commonmark

Commonmark is strictly adhered to unless otherwise specified.

## Existing informal spec

TODO see <https://stackoverflow.com/editing-help>

## HTML support

HTML support differs from Commonmark.

### Sanitization

TODO copy contents from <https://meta.stackexchange.com/questions/1777/what-html-tags-are-allowed-on-stack-exchange-sites>

### HTML Block support

TODO

### HTML Comments

TODO

## Code spans

TODO informal spec says html needs escaping, does it still and how does commonmark do it?

## Links / Images

TODO Autolinking, where do we support emails, [n] footnote support, attributes

## Headers

TODO only allowing h1-3

## Tags

TODO [tag:elephants], [meta-tag:discussion] syntax

## Spoilers

TODO >! syntax

## Stack Snippets

TODO

## Code block highlighting

TODO <!-- language\* comments
TODO code fence highlighting via info string

## Tables

For tables we’re following the [GitHub-flavored Markdown specification](https://github.github.com/gfm/#tables-extension-).

You can create a simple table like this:

```
| A header | another header |
| -------- | -------------- |
| a cell   | another cell   |
| second   | row goes here  |
```

A header row is mandatory. Opening and closing pipes are optional. A line separating the header from the body is mandatory.

You can set alignment for a column by adding a colon character on the separator line in the specific column. A colon before the separator makes it left-aligned, a colon after the separator makes the column right-aligned, a colon on both ends makes it centered. If you don't specify any alignment, a column will be left-aligned by default.

```
| left | center | right |
| :--- | :----: | ----: |
| text | goes   | here  |
```

A table cell can have inline content only (text, images, links, are allowed; sub-tables, code blocks, blockquotes, multiple paragraphs are not allowed).

You can, but don’t have to, align pipes in your table’s markdown presentation. Each table row must have the same amount of cells.

## Extensions from supported HTML

TODO dl,dd,dt; sup,sub; kbd

## @ Mentions

TODO

## Differences in implementation for comments

TODO

## Magic Links

TODO (certain links get auto transformed visually)
