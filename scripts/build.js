const FS = require('fs');
const Child = require('child_process').execSync;

const Pkg = JSON.parse(FS.readFileSync('package.json'));

function fileReplace(fileName, placeholder, value) {
    const originalFile = FS.readFileSync(fileName).toString();
    FS.writeFileSync(fileName, originalFile.replace(placeholder, value));
}

function writeOverrides(overrides = undefined) {
    FS.writeFileSync(
        'package.json',
        JSON.stringify(
            {
                ...Pkg,
                browser: overrides
            },
            null,
            4
        ) + '\n'
    );
}

// Copy local package files
Child('npm run clean');
Child('npm run compile');
Child('npm run compile:module');

// Embed package version into CJS and ES modules
fileReplace('dist/cjs/index.js', '__STANZAJS_VERSION__', Pkg.version);
fileReplace('dist/es/index.js', '__STANZAJS_VERSION__', Pkg.version);

Child('npm run compile:rollup');

// Create browser specific module
writeOverrides(Pkg.stanzajs_env_mappings.browser);
Child('npm run compile:rollup-browser');

// Create react-native specific module
writeOverrides(Pkg.stanzajs_env_mappings['react-native']);
Child('npm run compile:rollup-react-native');

// Clean up overrides
writeOverrides(undefined);

Child('mkdir dist/npm');
Child('cp -r dist/cjs/* dist/npm/');
Child('cp dist/es/index.module.js dist/npm/module.js');
Child('cp dist/es/index-browser.module.js dist/npm/browser-module.js');
Child('cp dist/es/index-rn.module.js dist/npm/rn-module.js');
Child(`cp ${__dirname}/../*.md dist/npm`);
Child('npm run compile:webpack');

// Create package.json file
FS.writeFileSync(
    'dist/npm/package.json',
    JSON.stringify(
        {
            ...Pkg,
            browser: './browser-module.js',
            devDependencies: undefined,
            main: './index.js',
            module: './module.js',
            private: false,
            'react-native': './rn-module.js',
            scripts: undefined,
            sideEffects: false,
            stanzajs_env_mappings: undefined,
            typings: './index'
        },
        null,
        2
    )
);

// Create package bundle
Child('cd dist/npm && npm pack');
Child(`mv dist/npm/*.tgz ${__dirname}/../dist/${Pkg.name}.tgz`);
