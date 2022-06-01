const Path = require('path');
const Webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
    entry: './dist/npm/index.js',

    output: {
        filename: 'stanza.browser.js',
        library: 'XMPP',
        libraryTarget: 'window',
        path: Path.resolve('dist')
    },

    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            defaultSizes: 'gzip',
            reportFilename: 'webpack-stats.html'
        })
    ]
};
