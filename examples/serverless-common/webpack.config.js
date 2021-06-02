const path = require('path');

module.paths.unshift(path.join(process.cwd(), 'node_modules'));

/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-extraneous-dependencies */
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
/* eslint-enable import/no-unresolved */
/* eslint-enable import/no-extraneous-dependencies */

const { stage } = slsw.lib.options;

// Required for Create React App Babel transform
process.env.NODE_ENV = stage === 'prod' ? 'production' : 'development';

// eslint-disable-next-line no-console
console.log(`Bundling with webpack for environment ${process.env.NODE_ENV}`);

module.exports = {
  entry: slsw.lib.entries,
  target: 'node14.15',
  // Since 'aws-sdk' is not compatible with webpack,
  // we exclude all node dependencies
  externals: [
    'aws-sdk',
    nodeExternals(),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: __dirname,
        exclude: /node_modules/,
      },
    ],
  },
  mode: process.env.NODE_ENV,
  optimization: {
    // We do not want to minimize our code.
    minimize: false,
  },
  stats: 'errors-only',
  output: {
    libraryTarget: 'commonjs',
    path: path.join(process.cwd(), '.webpack'),
    filename: '[name].js',
    pathinfo: process.env.NODE_ENV !== 'production',
  },
  node: {
    __dirname: true,
    __filename: true,
  },
};
