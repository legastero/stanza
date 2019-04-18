const FS = require('fs');
const Child = require('child_process').execSync;

// Copy local package files
Child('npm run clean');
Child('npm run compile');
Child('npm run compile:module');
Child('npm run compile:rollup');
Child('npm run compile:rollup-browser');
Child('mkdirp dist/npm');
Child('cp -r dist/cjs/* dist/npm/');
Child('cp dist/es/index.module.js dist/npm/module.js');
Child('cp dist/es/index-browser.module.js dist/npm/browser-module.js');
Child(`cp ${__dirname}/../*.md dist/npm`);
Child('npm run compile:webpack');

// Create package.json file
const Pkg = JSON.parse(FS.readFileSync('package.json'));
FS.writeFileSync(
    'dist/npm/package.json',
    JSON.stringify(
        {
            ...Pkg,
            browser: {
                ...Pkg.browser,
                './module.js': './browser-module.js'
            },
            devDependencies: undefined,
            'jsnext:main': './module.js',
            main: './index.js',
            module: './module.js',
            private: false,
            scripts: undefined,
            sideEffects: false,
            typings: './index'
        },
        null,
        2
    )
);

// Create package bundle
Child('cd dist/npm && npm pack');
Child(`mv dist/npm/*.tgz ${__dirname}/../dist/${Pkg.name}.tgz`);
