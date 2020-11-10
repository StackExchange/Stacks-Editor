const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = [
    merge(common, {
        // output two bundles
        entry: {
            // one for consumimg via import/require calls
            app: "./src/index.ts",
            // one for consumimg via <script> tags
            browser: "./src/browser.ts",
        },
        mode: "production",
    }),
];
