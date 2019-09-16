const HtmlWebpackPlugin = require("html-webpack-plugin");
const postcssNormalize = require("postcss-normalize");
const fs = require('fs');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const SizePlugin = require('size-plugin');
const basePath = process.cwd();

//#region Env is Recognized
const dotenv = basePath + "/.env";
const NODE_ENV = process.env.NODE_ENV;
var dotenvFiles = [
  `${dotenv}.${NODE_ENV}.local`,
  `${dotenv}.${NODE_ENV}`,
  NODE_ENV !== "test" && `${dotenv}.local`,
  dotenv
].filter(Boolean);
dotenvFiles.forEach(dotenvFile => {
  if (fs.existsSync(dotenvFile)) {
    require("dotenv-expand")(
      require("dotenv").config({
        path: dotenvFile
      })
    );
  }
});

function getClientEnvironment() {
  const raw = Object.keys(process.env).reduce(
    (env, key) => {
      env[key] = process.env[key];
      return env;
    },
    {
      NODE_ENV: process.env.NODE_ENV || "development"
    }
  );
  // Stringify all values so we can feed into Webpack DefinePlugin
  const stringified = {
    "process.env": Object.keys(raw).reduce((env, key) => {
      env[key] = JSON.stringify(raw[key]);
      return env;
    }, {})
  };

  return {
    raw,
    stringified
  };
}
//#endregion

module.exports = () => {
  const webpackEnv = process.env.NODE_ENV;
  const isEnvDevelopment = webpackEnv === "development";
  const isEnvProduction = webpackEnv === "production";
  const getStyleLoaders = (cssOptions, preProcessor) => {
    const loaders = [
      isEnvDevelopment && require.resolve("style-loader"),
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        options: shouldUseRelativeAssetPaths ? { publicPath: "../../" } : {}
      },
      {
        loader: require.resolve("css-loader"),
        options: cssOptions
      },
      {
        // Options for PostCSS as we reference these options twice
        // Adds vendor prefixing based on your specified browser support in
        // package.json
        loader: require.resolve("postcss-loader"),
        options: {
          // Necessary for external CSS imports to work
          // https://github.com/facebook/create-react-app/issues/2677
          ident: "postcss",
          plugins: () => [
            require("postcss-flexbugs-fixes"),
            require("postcss-preset-env")({
              autoprefixer: {
                flexbox: "no-2009"
              },
              stage: 3
            }),
            // Adds PostCSS Normalize as the reset css with default options,
            // so that it honors browserslist config in package.json
            // which in turn let's users customize the target behavior as per their needs.
            postcssNormalize()
          ],
          sourceMap: false
        }
      }
    ].filter(Boolean);
    if (preProcessor) {
      loaders.push({
        loader: require.resolve(preProcessor),
        options: {
          sourceMap: false
        }
      });
    }
    return loaders;
  };
  return {
    mode: isEnvProduction ? "production" : isEnvDevelopment && "development",
    entry: basePath + "/src/index.js",
    output: {
      path: isEnvProduction ? basePath + "/build" : undefined,
      filename: isEnvProduction
        ? "static/js/[name].[contenthash:8].js"
        : isEnvDevelopment && "static/js/bundle.js",
      chunkFilename: isEnvProduction
        ? "static/js/[name].[contenthash:8].chunk.js"
        : isEnvDevelopment && "static/js/[name].chunk.js",
      publicPath: "/"
    },
    devServer: {
      historyApiFallback: { disableDotRule: true }
    },
    optimization: {
      minimize: isEnvProduction,
      splitChunks: {
        chunks: "all"
      }
    },
    module: {
      rules: [
        // {
        //   test: /\.(js|mjs|jsx|ts|tsx)$/,
        //   enforce: "pre",
        //   exclude: /node_modules/,
        //   use: [
        //     {
        //       options: {
        //         eslintPath: require.resolve("eslint")
        //       },
        //       loader: require.resolve("eslint-loader")
        //     }
        //   ],
        //   include: basePath + "/src"
        // },
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
          loader: require.resolve("url-loader"),
          options: {
            limit: 10000,
            name: "static/media/[name].[hash:8].[ext]"
          }
        },
        {
          test: /\.(js|mjs|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          loader: require.resolve("babel-loader"),
          options: {
            cacheDirectory: true,
            babelrc: false,
            presets: [
              [
                "@babel/env",
                {
                  targets: {
                    node: true
                  }
                }
              ],
              "@babel/react"
            ],
            plugins: [
              "@babel/syntax-dynamic-import",
              "@babel/plugin-proposal-class-properties",
              "@babel/plugin-syntax-class-properties"
            ]
          }
        },
        {
          test: /\.(scss|sass)$/,
          exclude: /\.module\.(scss|sass)$/,
          use: getStyleLoaders(
            {
              importLoaders: 2,
              sourceMap: false
            },
            "sass-loader"
          ),
          // Don't consider CSS imports dead code even if the
          // containing package claims to have no side effects.
          // Remove this when webpack adds a warning or an error for this.
          // See https://github.com/webpack/webpack/issues/6571
          sideEffects: true
        },
        // Adds support for CSS Modules, but using SASS
        // using the extension .module.scss or .module.sass
        {
          test: /\.module\.(scss|sass)$/,
          use: getStyleLoaders(
            {
              importLoaders: 2,
              sourceMap: false,
              modules: true
            },
            "sass-loader"
          )
        },
        {
          loader: require.resolve("file-loader"),
          exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/, /\.scss$/],
          options: {
            name: "static/media/[name].[hash:8].[ext]"
          }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin(
        Object.assign(
          {},
          {
            inject: true,
            template: basePath + "/src/index.html"
          },
          isEnvProduction
            ? {
                minify: {
                  removeComments: true,
                  collapseWhitespace: true,
                  removeRedundantAttributes: true,
                  useShortDoctype: true,
                  removeEmptyAttributes: true,
                  removeStyleLinkTypeAttributes: true,
                  keepClosingSlash: true,
                  minifyJS: true,
                  minifyCSS: true,
                  minifyURLs: true
                }
              }
            : undefined
        )
      ),
      new webpack.DefinePlugin({
        ...getClientEnvironment().stringified
      })
      // new WebpackBar({
      //   name: "client"
      // }),
      // new SizePlugin()
    ]
  };
};
