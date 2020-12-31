const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const svgToMiniDataURI = require("mini-svg-data-uri");

module.exports = {
    mode: "production",
    entry: {
        app: "./src/browser.ts",
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.svg$/i,
                type: "asset/inline",
                generator: {
                    dataUrl: (content) => svgToMiniDataURI(content.toString()),
                },
                issuer: /\.less$/i,
            },
            {
                test: /\.less$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    { loader: "css-loader", options: { importLoaders: 2 } },
                    "postcss-loader",
                    "less-loader",
                ],
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
        library: "stacksEditor",
        libraryTarget: "umd",
    },
    plugins: [new CleanWebpackPlugin(), new MiniCssExtractPlugin()],
};
