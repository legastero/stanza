# StanzaJS

**Modern XMPP, with a JSON API.**

<hr />

![](https://img.shields.io/npm/v/stanza.svg?style=flat) [![](https://img.shields.io/badge/endpoint.svg?url=https://stanzajs.org/discuss/badge.json&style=flat)](https://stanzajs.org/discuss/logs/)

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

    transport: 'websocket',
    wsURL: 'wss://example.com:5281/xmpp-websocket'
    // (or `boshURL` if using 'bosh' as the transport)
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

-   [JXT: JSON/XML Translation](docs/jxt/README.md)
-   [Supported XEP Formats](docs/Supported_XEP_Formats.md)
-   [Creating Plugins](docs/Create_Plugin.md)
-   [Using PubSub](docs/Using_PubSub.md)
-   [Using with React Native](docs/React_Native.md)

## Discussion

MUC Room: [discuss@stanzajs.org](https://stanzajs.org/discuss/logs) / [Logs](https://stanzajs.org/discuss/logs)

## License

[MIT](./LICENSE.md)

## Created By

If you like this, follow [@lancestout](http://twitter.com/lancestout) on Twitter.
