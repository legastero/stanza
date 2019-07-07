# Using StanzaJS with React Native

**Requires react-native@0.59**.

> There is currently an issue with linking `react-native-randombytes` when using `react-native@0.60`.

StanzaJS does work with React Native (0.59), but it requires a little bit of extra configuration to shim properly.

## 1. Add required dependencies to your package.json:

-   `node-libs-react-native`
-   `vm-browserify`
-   `react-native-randombytes`

```sh
npm i --save node-libs-react-native vm-browserify react-native-randombytes
```

## 2. Configure metro.config.js to shim node libraries

Add a `resolver` section to the Metro config, specifying the `extraNodeModules` to use:

```js
// metro.config.js

module.exports = {
    transformer: {
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: false
            }
        })
    },
    resolver: {
        extraNodeModules: {
            ...require('node-libs-react-native'),
            vm: require.resolve('vm-browserify')
        }
    }
};
```

The `vm` module is not currently shimmed by `node-libs-react-native` ([but there is a PR for it](https://github.com/parshap/node-libs-react-native/pull/17)).

## 3. Link native modules

Link the `react-native-randombytes` module:

```sh
react-native link
```

## 4. Add node globals shim:

Add an import for `node-libs-react-native/globals`:

```js
// your top-level index.js

import 'node-libs-react-native/globals';
```

## Done

Your app should now be able to load and use StanzaJS. If you are trying to use Jingle and WebRTC, you will need to also set up [react-native-webrtc](https://github.com/react-native-webrtc/react-native-webrtc).
