import resolve from 'rollup-plugin-node-resolve';
import visualizer from 'rollup-plugin-visualizer';
import { terser } from 'rollup-plugin-terser';

import baseconfig from './rollup.config';

export default {
    ...baseconfig,
    output: {
        file: 'dist/es/index-browser.module.js',
        format: 'es'
    },
    plugins: [
        resolve({
            browser: true
        }),
        terser(),
        visualizer({
            filename: './dist/rollup-stats.html',
            open: true,
            sourcemaps: true,
            template: 'treemap'
        })
    ]
};
