const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require("fs");

const htmlLayout = fs.readFileSync("./site/layout.html");

module.exports = (env, argv) => {
    // add --mode=production to flip this into a pseudo-production server
    const emulateProdServer = argv.mode === "production";
    return [
        merge(common(env, argv), {
            entry: {
                app: {
                    import: "./site/index.ts",
                    dependOn: "serviceworker",
                },
                serviceworker: "./site/serviceworker.ts",
            },
            mode: emulateProdServer ? "production" : "development",
            devtool: emulateProdServer ? false : "inline-source-map",
            devServer: {
                open: false,
                host:
                    // set the host to 0.0.0.0 by default so we can preview the demo on other devices in the same network
                    // NOTE: 0.0.0.0 doesn't work on Windows machines, so settle for localhost instead
                    emulateProdServer && process.platform !== "win32"
                        ? "0.0.0.0 "
                        : "localhost",
                hot: true,
                static: {
                    watch: {
                        ignored: ["test/**/*", "node_modules/**"],
                    },
                },
                compress: emulateProdServer,
            },
            plugins: [
                // create an html page for every item in ./site/views
                ...fs.readdirSync("./site/views").map((f) => {
                    const htmlView = fs.readFileSync(
                        `./site/views/${f}`,
                        "utf8"
                    );

                    return new HtmlWebpackPlugin({
                        templateContent: new Function(
                            ["content"],
                            `return \`${htmlLayout}\`;`
                        )(htmlView),
                        filename: f,
                    });
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
        }),
    ];
};
