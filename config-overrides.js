const webpack = require('webpack');
const path = require('path');

module.exports = function override(config, env) {
  // Add resolve.alias for process/browser
  config.resolve.alias = {
    ...config.resolve.alias,
    'process/browser': path.resolve(__dirname, 'src/process-browser-shim.js'),
  };

  // Force specific modules to use our custom process/browser shim
  config.module.rules.push({
    test: /\.m?js$/,
    include: [
      /node_modules\/canvg/,
      /node_modules\/jspdf/,
      /node_modules\/jspdf\/node_modules\/canvg/
    ],
    resolve: {
      alias: {
        'process/browser': path.resolve(__dirname, 'src/process-browser-shim.js')
      }
    }
  });

  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer/"),
    "util": require.resolve("util/"),
    "assert": require.resolve("assert/"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify/browser"),
    "url": require.resolve("url/"),
    "vm": require.resolve("vm-browserify"),
    "process": path.resolve(__dirname, 'src/process-browser-shim.js')
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: path.resolve(__dirname, 'src/process-browser-shim.js'),
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env)
    })
  ];

  return config;
} 