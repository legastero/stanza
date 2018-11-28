# Change Log

## 10.0.0
* Converted to ES modules, using Typescript compiler for downleveling.
* Moved stanza definitions back from `jxt-xmpp`, obsoleting both `jxt-xmpp` and `jxt-xmpp-types`.

## 9.1.0 -> 9.2.0
* Fixed CSI namespace to use `urn:xmpp:csi:0`
* Added support for XEP-0333 Chat Markers

## 6.0.0 -> 6.0.1
* **Bug Fixes**
    * [#31: Resolve Unicode interop with other clients](https://github.com/otalk/stanza.io/issues/31)

## 5.x.x -> 6.0.0
* **Breaking Changes**
    * Removed `client.call()`
      
        See the [jingle-interop-demos](https://github.com/legastero/jingle-interop-demos/commit/79f50cd481859ce837bda5eff0b7a6a272f0d1d8) for how to recreate the behaviour by working directly with the [jingle.js](https://github.com/otalk/jingle.js) and [localmedia](https://github.com/otalk/localmedia) libraries.


        ```javascript
        var localMedia = require('localmedia');

        localMedia.start();

        //...

        var sess = client.jingle.createMediaSession(peerJID);
        sess.addStream(localMedia.localStream);
        sess.start();
        ```

    * `client.jingle` was updated to a `jingle.js v1.0` instance.

        The method `client.jingle.startLocalMedia()` has been removed, in favor of using the [localmedia](https://github.com/otalk/localmedia) module instead (which is not bundled in `stanza.io`).
