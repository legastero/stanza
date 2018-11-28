const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const Pkg = require('./package.json');

module.exports = {
    entry: './src/index.js',

    output: {
        filename: 'stanzaio.bundle.js',
        library: 'XMPP',
        libraryTarget: 'window',
        path: path.resolve('build')
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
            },
            {
                exclude: /node_modules/,
                loader: 'ts-loader',
                test: /\.m?[jt]s$/
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
