# Stanza.io

**Modern XMPP in the browser, with a JSON API.**

<hr />
<img src="https://img.shields.io/npm/v/stanza.io.svg?style=flat" /> <a href="xmpp:discuss@stanza.io?join"><img src="https://img.shields.io/badge/endpoint.svg?url=https://stanza.io/discuss/badge.json&style=flat" /></a>

## What is this?

Stanza.io is a library for using modern XMPP in the browser, and it does that by exposing everything as JSON. Unless you insist, you
have no need to ever see or touch any XML when using stanza.io.

## Installing

```sh
$ npm install stanza.io

```

## Getting Started

1. Find or install a server which supports XMPP over WebSocket (Prosody recommended).
2. Clone this repo with `git clone https://github.com/legastero/stanza.io.git`
3. Run `npm install` in the new `stanza.io` directory.
4. Run `npm run build` to create `dist/stanzaio.browser.js`.
5. Open `demo.html` in your browser.
6. Enter your connection info, click connect.
7. Use the JS console to play with the XMPP client (`var client`).

## Echo Client Demo

```javascript
var XMPP = require('stanza.io');

var client = XMPP.createClient({
    jid: 'echobot@example.com',
    password: 'hunter2',

    // If you have a .well-known/host-meta.json file for your
    // domain, the connection transport config can be skipped.

    transport: 'websocket',
    wsURL: 'wss://example.com:5281/xmpp-websocket'
    // (or `boshURL` if using 'bosh' as the transport)
});

client.on('session:started', function() {
    client.getRoster();
    client.sendPresence();
});

client.on('chat', function(msg) {
    client.sendMessage({
        to: msg.from,
        body: 'You sent: ' + msg.body
    });
});

client.connect();
```

## Documentation

-   [API Reference](docs/Reference.md)
-   [JIDs](docs/JID.md)
-   [Supported XEPs](docs/Supported_XEPs.md)
-   [Creating Plugins](docs/Create_Plugin.md)
-   [Using PubSub](docs/Using_Pubsub.md)

## Discussion

[MUC Room: discuss@stanza.io](xmpp:discuss@stanza.io?join) / [Logs](https://stanza.io/discuss/logs)

## License

[MIT](./LICENSE)

## Created By

If you like this, follow [@lancestout](http://twitter.com/lancestout) on twitter.
