const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require("fs");

module.exports = (env, argv) => {
    // create an html page for every item in ./site/variants
    const pageVariantPlugins = fs.readdirSync("./site/variants").map(
        (f) =>
            new HtmlWebpackPlugin({
                template: "./site/variants/" + f,
                filename: f,
            })
    );

    // add --mode=production to flip this into a pseudo-production server
    const emulateProdServer = argv.mode === "production";
    return merge(common(env, argv), {
        entry: {
            app: "./site/index.ts",
            serviceworker: "./site/serviceworker.ts",
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
            ...pageVariantPlugins,
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
