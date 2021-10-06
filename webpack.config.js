const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
require("dotenv").config();

module.exports = {
  entry: "./src/main.js",
  output: {
    path:
      process.env.NODE_ENV === "production"
        ? path.resolve(__dirname, "dist/js")
        : path.resolve(__dirname, "public/extensions/BeeInventor/contents"),
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      CDN_DOMAIN:
        process.env.NODE_ENV === "production"
          ? JSON.stringify(process.env.CDN_DOMAIN)
          : JSON.stringify(""),
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css'
    }),
  ],
  devtool:
    process.env.NODE_ENV === "production"
      ? "source-map"
      : "eval-cheap-source-map",
};
