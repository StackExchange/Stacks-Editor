/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/ban-ts-comment */
/*
 * NOTE: This file is only for local development / generic bundles
 * The "stackoverflow" build config completely removes highlight.js from the bundle,
 * expecting it to be supplied globally as `window.hljs`, already configured and ready to go
 * TODO this file is a mess... can we clean it up a bit?
 */

import hljs from "highlight.js/lib/core";

// don't try to register anything if we're loading from window
// @ts-expect-error
if (hljs && !global.hljs) {
    // include just the languages that are supported on Stack Overflow
    hljs.registerLanguage(
        "markdown",
        require("highlight.js/lib/languages/markdown")
    );
    hljs.registerLanguage("bash", require("highlight.js/lib/languages/bash"));
    hljs.registerLanguage(
        "c-like",
        require("highlight.js/lib/languages/c-like")
    );
    hljs.registerLanguage("cpp", require("highlight.js/lib/languages/cpp"));
    hljs.registerLanguage(
        "csharp",
        require("highlight.js/lib/languages/csharp")
    );
    hljs.registerLanguage(
        "coffeescript",
        require("highlight.js/lib/languages/coffeescript")
    );
    hljs.registerLanguage("xml", require("highlight.js/lib/languages/xml"));
    hljs.registerLanguage("java", require("highlight.js/lib/languages/java"));
    hljs.registerLanguage("json", require("highlight.js/lib/languages/json"));
    hljs.registerLanguage("perl", require("highlight.js/lib/languages/perl"));
    hljs.registerLanguage(
        "python",
        require("highlight.js/lib/languages/python")
    );
    hljs.registerLanguage("ruby", require("highlight.js/lib/languages/ruby"));
    hljs.registerLanguage(
        "clojure",
        require("highlight.js/lib/languages/clojure")
    );
    hljs.registerLanguage("css", require("highlight.js/lib/languages/css"));
    hljs.registerLanguage("dart", require("highlight.js/lib/languages/dart"));
    hljs.registerLanguage(
        "erlang",
        require("highlight.js/lib/languages/erlang")
    );
    hljs.registerLanguage("go", require("highlight.js/lib/languages/go"));
    hljs.registerLanguage(
        "haskell",
        require("highlight.js/lib/languages/haskell")
    );
    hljs.registerLanguage(
        "javascript",
        require("highlight.js/lib/languages/javascript")
    );
    hljs.registerLanguage(
        "kotlin",
        require("highlight.js/lib/languages/kotlin")
    );
    //hljs.registerLanguage("tex", require("highlight.js/lib/languages/tex"));
    hljs.registerLanguage("lisp", require("highlight.js/lib/languages/lisp"));
    hljs.registerLanguage(
        "scheme",
        require("highlight.js/lib/languages/scheme")
    );
    hljs.registerLanguage("lua", require("highlight.js/lib/languages/lua"));
    hljs.registerLanguage(
        "matlab",
        require("highlight.js/lib/languages/matlab")
    );
    hljs.registerLanguage(
        "mathematica",
        require("highlight.js/lib/languages/mathematica")
    );
    hljs.registerLanguage("ocaml", require("highlight.js/lib/languages/ocaml"));
    //hljs.registerLanguage("pascal", require("highlight.js/lib/languages/pascal"));
    hljs.registerLanguage(
        "protobuf",
        require("highlight.js/lib/languages/protobuf")
    );
    hljs.registerLanguage("r", require("highlight.js/lib/languages/r"));
    hljs.registerLanguage("rust", require("highlight.js/lib/languages/rust"));
    hljs.registerLanguage("scala", require("highlight.js/lib/languages/scala"));
    hljs.registerLanguage("sql", require("highlight.js/lib/languages/sql"));
    hljs.registerLanguage("swift", require("highlight.js/lib/languages/swift"));
    hljs.registerLanguage("vhdl", require("highlight.js/lib/languages/vhdl"));
    hljs.registerLanguage(
        "vbscript",
        require("highlight.js/lib/languages/vbscript")
    );
    //hljs.registerLanguage("yml", require("highlight.js/lib/languages/yml"));
}

export function getHljsInstance(): HLJSApi {
    return (
        // @ts-expect-error
        (global.hljs as HLJSApi) ||
        (require("highlight.js/lib/core") as HLJSApi)
    );
}
