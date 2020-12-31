const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = [
    merge(common, {
        entry: {
            app: "./src/index.ts",
            styles: "./src/styles/index.less",
        },
        mode: "production",
    }),
];
