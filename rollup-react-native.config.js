import baseconfig from './rollup-browser.config';

export default {
    ...baseconfig,
    output: {
        file: 'dist/es/index-rn.module.js',
        format: 'es'
    }
};
