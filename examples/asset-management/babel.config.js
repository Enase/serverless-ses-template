module.exports = {
  compact: true,
  targets: {
    node: '14.15.4',
  },
  plugins: [
    '@babel/plugin-transform-runtime',
  ],
  presets: [
    [
      '@babel/env',
      {
        shippedProposals: true,
        useBuiltIns: 'usage',
        corejs: 3,
      },
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
  ],
  ignore: [/node_modules/],
};
