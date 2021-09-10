# Using StanzaJS with React Native

StanzaJS does work with React Native (through 0.65), but it requires a little bit of extra configuration to shim properly.

## 1. Add required dependencies to your package.json:

-   `node-libs-react-native`
-   `react-native-get-random-values` (or `expo-standard-web-crypto`)
-   `vm-browserify`

If you are using WebRTC, you will also need `react-native-webrtc`.


## 2. Configure metro.config.js to shim node libraries

Add a `resolver` section to the Metro config, specifying the `extraNodeModules` to use:

```js
// metro.config.js

module.exports = {
    resolver: {
        extraNodeModules: {
            ...require('node-libs-react-native'),
            vm: require.resolve('vm-browserify')
        }
    }
};
```

The `vm` module is not currently shimmed by `node-libs-react-native` ([but there is a PR for it](https://github.com/parshap/node-libs-react-native/pull/17)).

## 3. Import shims


```js
// your top-level index.js

import 'node-libs-react-native/globals';

// If you are using react-native-get-random-values:
import 'react-native-get-random-values';
// Or if you are using expo-standard-web-crypto:
import { polyfillWebCrypto } from 'expo-standard-web-crypto';
polyfillWebCrypto();

// If you are using WebRTC:
import { registerGlobals } from 'react-native-webrtc';
registerGlobals();
```

## Done

Your app should now be able to load and use StanzaJS.

