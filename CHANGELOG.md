# Change Log

## 12.10.0

-   BOSH and WebSocket transports are now based on Duplex streams.
-   Stream management state caching may now by async.
-   Expanded the set of events related to stream management. See [Using Stream Management](./docs/Using_Stream_Management.md). These events are:
    -   `stanza:hibernated`
    -   `message:hibernated`
    -   `message:acked`
    -   `message:failed`
    -   `message:retry`

## 12.9.0

-   The default external service discovery namespace was changed to `urn:xmpp:extdisco:2`. Querying using the `:1` namespace can be done with `client.discoverICEServers({ version: '1' })`.

## 12.0.0

**WARNING:** Unlike many previous major version bumps that were almost entirely backwards compatible, v12 is _not_ backwards compatible. Upgrading to v12 _will_ require modifications in existing code.

-   Complete TypeScript support
-   Changed JXT implementation (**old JXT definitions will not work**). See [JXT docs](./docs/jxt/README.md) for more information.
-   **Changed structure/names of JXT definitions for supported XEPs.** See [Supported XEP Formats]('./docs/Supported_XEP_Formats.md) for links to the type definitions of each XEP supported by StanzaJS.
-   **Removed support for callbacks.** All methods now support Promises only.
-   Methods using IQ stanzas now return the requested data instead of the full IQ stanza data.
-   Changed SASL implementation. Old, custom SASL mechanisms will not work.
-   **Removed JID objects.** JIDs are now treated as strings only. [See src/JID.ts for helper functions.]('./src/JID.ts)
-   Implemented Stringprep (not PRECIS, yet).
-   **Removed WildEmitter.** Now using standard EventEmitter. Event handlers using `*` wildcards will need to be changed.
    -   The `*` and `raw:*` events are still supported.
-   Added input/display helpers for Realtime Text.
-   **Configuration of transports has changed.** The wsURL/boshURL/transport fields are no longer used. Configuring transports is now done by setting the `transports` field to an object:

    ```
    XMPP.createClient({
        transports: {
            websocket: 'wss://...',
            bosh: 'https://...'
        }
    })
    ```

    Using `false` instead of a URL will disable that transport type. An object can be used to pass additional configuration, such as BOSH pre-binding rid/sid:

    ```
    XMPP.createClient({
        transports: {
            websocket: false,
            bosh: {
                url: 'https://...',
                rid: 1234,
                sid: '...'
            }
        }
    })
    ```

## 11.1.0

-   Jingle sessions now queue local actions to allow safer handling of WebRTC peer connection objects.

## 11.0.0

-   **Changed package name from `stanza.io` to `stanza`.**
-   The new website URL is https://stanzajs.org

## 10.0.0 -> 10.1.0

-   Renamed `muc:affiliation` event to `muc:other`

## 10.0.0

-   Converted to ES modules, using Typescript compiler for downleveling.
-   Moved stanza definitions back from `jxt-xmpp`, obsoleting both `jxt-xmpp` and `jxt-xmpp-types`.
-   Replaced use of `request` and `xhr` with `cross-fetch`.
-   SASL mech implementations now live inside `stanza.io`.
-   Moved host-meta fetching logic into `stanza.io`.
-   Moved `xmpp-jid` implementation back into `stanza.io`, obsoleting `xmpp-jid`.
-   Use `ws` module instead of `faye-websocket`.
-   Dropped support of old, pre-RFC XMPP-over-WebSocket.
-   Moved `jingle` implementation back into `stanza.io`.

## 9.1.0 -> 9.2.0

-   Fixed CSI namespace to use `urn:xmpp:csi:0`
-   Added support for XEP-0333 Chat Markers

## 6.0.0 -> 6.0.1

-   **Bug Fixes**
    -   [#31: Resolve Unicode interop with other clients](https://github.com/otalk/stanza.io/issues/31)

## 5.x.x -> 6.0.0

-   **Breaking Changes**

    -   Removed `client.call()`

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
