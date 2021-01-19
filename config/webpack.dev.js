const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (env, argv) => {
    // add --mode=production to flip this into a pseudo-production server
    const emulateProdServer = argv.mode === "production";
    return merge(common(env, argv), {
        entry: {
            app: "./site/index.ts",
        },
        mode: emulateProdServer ? "production" : "development",
        devtool: emulateProdServer ? false : "inline-source-map",
        devServer: {
            open: true,
            host:
                // set the host to 0.0.0.0 by default so we can preview the demo on other devices in the same network
                // NOTE: 0.0.0.0 doesn't work on Windows machines, so settle for localhost instead
                emulateProdServer && process.platform !== "win32"
                    ? "0.0.0.0 "
                    : "localhost",
            watchOptions: {
                ignored: ["test/**/*", "node_modules/**"],
            },
            contentBase: "./dist",
            compress: emulateProdServer,
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "./site/index.html",
            }),
            new HtmlWebpackPlugin({
                template: "./site/variants/empty.html",
                filename: "empty.html",
            }),
            new HtmlWebpackPlugin({
                template: "./site/variants/noimage.html",
                filename: "noimage.html",
            }),
            new HtmlWebpackPlugin({
                template: "./site/variants/tables.html",
                filename: "tables.html",
            }),
        ],
        optimization: {
            splitChunks: {
                cacheGroups: {
                    // split highlightjs and languages into its own bundle for testing async language loading
                    hljs: {
                        test: /highlight.js/,
                        chunks: "all",
                    },
                },
            },
        },
    });
};
