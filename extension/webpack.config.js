const path = require("path");

module.exports = {
  entry: {
    "background/background": "./src/background/background.ts",
    "content/naukri": "./src/content/naukri.ts",
    "content/linkedin": "./src/content/linkedin.ts",
    "popup/popup": "./src/popup/popup.ts",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
};
