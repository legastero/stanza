import resolve from 'rollup-plugin-node-resolve';

export default {
    external: [
        'async',
        'cross-fetch',
        'events',
        'iana-hashes',
        'jxt',
        'punycode',
        'randombytes',
        'sdp',
        'stream',
        'tslib',
        'uuid',
        'wildemitter',
        'ws',
        'xmpp-jid'
    ],
    input: 'dist/es/index.js',
    output: {
        file: 'dist/es/index.module.js',
        format: 'es'
    },
    plugins: [resolve()]
};
