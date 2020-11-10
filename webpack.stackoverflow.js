const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const childProcess = require("child_process");
const webpack = require("webpack");
const package = require("./package.json");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = merge(common, {
    entry: {
        app: "./src/index.ts",
        // NOTE we also get a `styles.bundle.js`, ignore this
        styles: "./src/styles/index.less",
    },
    mode: "production",
    // don't bundle highlight.js or its languages since it is already on the site
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
    optimization: {
        // customize the minimizer settings so that it minimizes it *just* enough for the diff
        // to show in the GitHub ui, but not so much that the bundle isn't somewhat human readable
        minimizer: [
            new TerserPlugin({
                extractComments: false,
                terserOptions: {
                    compress: true,
                    mangle: false,
                    output: {
                        beautify: true,
                        // strip out all comments except our special commit info banner
                        comments: /^INFO/,
                    },
                },
            }),
        ],
    },
    performance: {
        // turn off cli warnings about asset size of large unminified file
        maxEntrypointSize: Infinity,
        maxAssetSize: Infinity,
    },
    plugins: [
        // prepend a comment containing the latest git commit hash to all built files
        new webpack.BannerPlugin({
            raw: true,
            banner: () => {
                // execute a `git` command against the local machine to get the latest commit hash
                var latestCommit = childProcess
                    .execSync("git rev-parse HEAD")
                    .toString()
                    .trim();
                var repo = package.repository.url.replace(".git", "");
                var banner = `Output built from Stacks-Editor commit ${latestCommit}
You can view all changes (and file diffs) via the GitHub ui like so:
${repo}/compare/LAST_COMMIT_HASH_HERE...${latestCommit}`;

                // check git for uncommitted changes that are being included and add a warning if there are any
                var uncommittedFiles = childProcess
                    .execSync("git diff HEAD --name-only")
                    .toString()
                    .trim();

                if (uncommittedFiles) {
                    banner += `\n\nWARNING: This build also contains uncommitted changes in the following files:\n${uncommittedFiles}`;
                }

                // since we're using the `raw` setting, we need to add our own custom comment wrapper
                banner = banner
                    .split(/\r?\n/)
                    .map((s) => " * " + s)
                    .join("\n");
                return `/*INFO\n${banner}\n*/`;
            },
        }),
    ],
});
