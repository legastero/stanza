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
        'iana-hashes',
        'jingle',
        'jxt',
        'randombytes',
        'tslib',
        'uuid',
        'wildemitter',
        'ws',
        'xmpp-jid'
    ]
};
