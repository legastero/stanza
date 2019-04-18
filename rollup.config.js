import resolve from 'rollup-plugin-node-resolve';

export default {
    external: [
        'async',
        'async-es',
        'cross-fetch',
        'crypto',
        'events',
        'jxt',
        'punycode',
        'sdp',
        'stream',
        'tslib',
        'uuid',
        'ws',
        'wildemitter'
    ],
    input: 'dist/es/index.js',
    output: {
        file: 'dist/es/index.module.js',
        format: 'es'
    },
    plugins: [resolve()]
};
