# StanzaJS

**Modern XMPP, with a JSON API.**

<hr />
<p>
<a href="https://npmjs.org/package/stanza"><img src="https://img.shields.io/npm/v/stanza.svg?style=flat" alt="npm" /></a>
<a href="https://cloud.drone.io/legastero/stanza"><img src="https://cloud.drone.io/api/badges/legastero/stanza/status.svg" alt="build status" /></a>
<a href="https://stanzajs.org/discuss/logs/"><img src="https://img.shields.io/badge/endpoint.svg?url=https://stanzajs.org/discuss/badge.json&style=flat" alt="chat" /></a>
</p>

## What is this?

StanzaJS is a library for using modern XMPP, and it does that by exposing everything as JSON. Unless you insist, you have no need to ever see or touch any XML when using StanzaJS.

## Installing

```sh
npm install stanza
```

## Echo Client Demo

```javascript
import * as XMPP from 'stanza';

const client = XMPP.createClient({
    jid: 'echobot@example.com',
    password: 'hunter2',

    // If you have a .well-known/host-meta.json file for your
    // domain, the connection transport config can be skipped.
    transports: {
        websocket: 'wss://example.com:5281/xmpp-websocket',
        bosh: 'https://example.com:5281/http-bind'
    }
});

client.on('session:started', () => {
    client.getRoster();
    client.sendPresence();
});

client.on('chat', msg => {
    client.sendMessage({
        to: msg.from,
        body: 'You sent: ' + msg.body
    });
});

client.connect();
```

## Documentation

-   API Reference
    -   [Configuring](docs/Configuring.md)
    -   [Events](docs/Events.md)
    -   [Client Methods](docs/Reference.md)
-   [JXT: JSON/XML Translation](docs/jxt/README.md)
    -   [Working with Languages](docs/jxt/Language.md)
    -   [Field Definition Types](docs/jxt/FieldTypes.md)
-   [Supported XEP Formats](docs/Supported_XEP_Formats.md)
-   [Creating Plugins](docs/Create_Plugin.md)
-   [Using with React Native](docs/React_Native.md)
-   [Using PubSub](docs/Using_PubSub.md)
-   [Using Stream Management](docs/Using_Stream_Management.md)

## Discussion

MUC Room: [discuss@stanzajs.org](https://stanzajs.org/discuss/logs) / [Logs](https://stanzajs.org/discuss/logs)

## Recommended Modules

These are some additional modules that are highly recommended for use with StanzaJS:

| Name                                                       | Description                                                                      | Source                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| [staydown](https://npmjs.org/package/staydown)             | Render helper that keeps an element scrolled to the bottom based on user intent. | [Source](https://github.com/fritzy/staydown)     |
| [webrtc-adapter](https://npmjs.org/package/webrtc-adapter) | Shims browsers to provide a consistent WebRTC API.                               | [Source](https://github.com/webrtchacks/adapter) |

## License

[MIT](./LICENSE.md)

Portions of StanzaJS are derived from prior works. [See NOTICE file for details.](./NOTICE.md)

## Created By

If you like this, follow [@lancestout](http://twitter.com/lancestout) on Twitter.
