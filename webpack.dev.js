const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const HtmlWebpackPlugin = require("html-webpack-plugin");

// set to `true` if you'd like an idea of how the bundle looks minified / gzipped
// set to `false` by default, don't check this change in!
const emulateProdServer = false;

module.exports = merge(common, {
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
        // add in some dummy endpoints - just for demo purposes
        before: function (app) {
            // dummy endpoint for uploading images
            app.post("/image/upload", async function (req, res) {
                console.log("Uploading dummy image");
                let url = `https://media.giphy.com/media/XIqCQx02E1U9W/giphy.gif`;
                // add in an artifical delay so it feels like we're uploading something
                url = await new Promise((resolve) =>
                    setTimeout(() => resolve(url), 2000)
                );
                res.json({ UploadedImage: url });
            });

            // dummy endpoint for link previews
            app.get("/posts/link-previews", async function (req, res) {
                console.log("Returning dummy link preview");

                let url = req.query.url;
                // add in an artifical delay so it feels like we're doing something
                url = await new Promise((resolve) =>
                    setTimeout(() => resolve(url), 5000)
                );

                // only render example.com urls, no matter what's registered downstream
                if (!url.includes("example.com")) {
                    res.json({ success: false });
                    return;
                }

                const date = new Date().toString();

                res.json({
                    data: `
                    <div class="s-link-preview js-onebox">
                        <div class="s-link-preview--header">
                            <div>
                                <a href="${url}" target="_blank" class="s-link-preview--title">Example link preview</a>
                                <div class="s-link-preview--details">Not really a real link preview, but it acts like one!</div>
                            </div>
                        </div>
                        <div class="s-link-preview--body">
                            <strong>This is a link preview, yo.</strong><br><br>We can run arbitrary JS in here, so here's the current date:<br><em>${date}</em>
                        </div>
                    </div>`,
                });
            });
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./site/index.html",
        }),
        new HtmlWebpackPlugin({
            template: "./site/empty.html",
            filename: "empty.html",
        }),
        new HtmlWebpackPlugin({
            template: "./site/noimage.html",
            filename: "noimage.html",
        }),
        new HtmlWebpackPlugin({
            template: "./site/tables.html",
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
