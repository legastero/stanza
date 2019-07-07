import resolve from 'rollup-plugin-node-resolve';
import visualizer from 'rollup-plugin-visualizer';

export default {
    external: [
        'async',
        'cross-fetch',
        'crypto',
        'events',
        'punycode',
        'sdp',
        'readable-stream',
        'stream',
        'tslib',
        'ws'
    ],
    input: 'dist/es/index.js',
    output: {
        file: 'dist/es/index.module.js',
        format: 'es'
    },
    plugins: [
        resolve(),
        visualizer({
            sourcemaps: true,
            open: true,
            template: 'treemap'
        })
    ]
};
