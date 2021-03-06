/* eslint-disable import/no-extraneous-dependencies */
import webpack from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'
// @ts-ignore
import ProgressBarPlugin from 'progress-bar-webpack-plugin'
import { outputPath, srcPath } from './constants'
import getCssLoaders from './getCssLoaders'
import babelConfig from './babel.config'

const config: webpack.Configuration = {
  entry: ['./src/polyfill.ts', './src/sentry.ts', 'react-hot-loader/patch', './src/index.tsx'],

  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.scss'],

    alias: {
      'react-dom': '@hot-loader/react-dom',
      src: srcPath,
    },
  },

  output: {
    path: outputPath,
    publicPath: '/',
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: babelConfig,
      },
      {
        test: /url-regex/,
        loader: 'babel-loader',
        options: {
          presets: [
            [
              '@babel/preset-env',
              {
                targets: {
                  esmodules: false,
                },
                useBuiltIns: 'entry',
                corejs: 3,
              },
            ],
          ],
        },
      },
      {
        test: /\.m\.scss$/,
        use: getCssLoaders(true),
      },
      {
        test: /\.s?css$/,
        use: getCssLoaders(false),
        exclude: /\.m\.scss$/,
      },
      {
        test: /\.(png|jpg|gif|svg|ico)$/,
        loader: 'url-loader',
        options: {
          fallback: 'file-loader',
          limit: 4096,
          outputPath: 'static/images/',
        },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.ejs',
    }),

    new ProgressBarPlugin(),

    new webpack.DefinePlugin({
      'process.env.CC98_ENV': JSON.stringify(process.env.CC98_ENV),
      'process.env.GIT_HEAD': JSON.stringify(process.env.GIT_HEAD),
    }),
  ],

  stats: {
    all: undefined,
    colors: true,
    children: false,
  },

  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
}

export default config
