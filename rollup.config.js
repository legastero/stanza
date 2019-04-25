import resolve from 'rollup-plugin-node-resolve';

export default {
    external: [
        'async',
        'async-es',
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
    plugins: [resolve()]
};
