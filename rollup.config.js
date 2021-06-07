import resolve from 'rollup-plugin-node-resolve';

export default {
    external: [
        'async',
        'crypto',
        'events',
        'net',
        'tls',
        'node-fetch',
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
    plugins: [resolve({ browser: true, preferBuiltins: true })]
};
