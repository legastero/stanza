import resolve from 'rollup-plugin-node-resolve';
import visualizer from 'rollup-plugin-visualizer';

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
        visualizer({
            sourcemaps: true,
            open: true,
            template: 'treemap'
        })
    ]
};
