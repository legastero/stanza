import resolve from 'rollup-plugin-node-resolve';
import baseconfig from './rollup.config';

export default {
    ...baseconfig,
    plugins: [
        resolve({
            browser: true
        })
    ]
};
