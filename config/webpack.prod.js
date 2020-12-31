const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
    entry: {
        app: "./src/index.ts",
        // NOTE we also get a `styles.bundle.js`, ignore this
        styles: "./src/styles/index.less",
    },
    mode: "production",
    // don't bundle highlight.js or its languages; we expect consumers to supply these themselves
    externals: function (_, request, callback) {
        if (/^highlight.js/.test(request)) {
            return callback(null, {
                commonjs: request,
                commonjs2: request,
                root: "hljs",
            });
        }

        callback();
    },
});
