import resolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

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
    plugins: [resolve(), terser()]
};
