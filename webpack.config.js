const Path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const Pkg = require('./package.json');

module.exports = {
    entry: './dist/npm/module.js',

    output: {
        filename: 'stanza.browser.js',
        library: 'XMPP',
        libraryTarget: 'window',
        path: Path.resolve('dist')
    },

    module: {
        rules: [
            {
                loader: 'string-replace-loader',
                options: {
                    replace: Pkg.version,
                    search: '__STANZAIO_VERSION__'
                },
                test: /index\.[jt]s/
            }
        ]
    },

    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            defaultSizes: 'gzip',
            reportFilename: 'bundle-stats.html'
        })
    ]
};
