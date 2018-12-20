import resolve from 'rollup-plugin-node-resolve';

export default {
    input: 'dist/es/index.js',
    output: {
        file: 'dist/es/index.module.js',
        format: 'es'
    },
    plugins: [resolve()],
    external: [
        'async',
        'cross-fetch',
        'events',
        'iana-hashes',
        'jxt',
        'randombytes',
        'sdp',
        'tslib',
        'uuid',
        'wildemitter',
        'ws',
        'xmpp-jid'
    ]
};
