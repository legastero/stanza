# Stanza.io
**Modern XMPP in the browser, with a JSON API.**

[![Build Status](https://travis-ci.org/otalk/stanza.io.png)](https://travis-ci.org/otalk/stanza.io)
[![Dependency Status](https://david-dm.org/otalk/stanza.io.png)](https://david-dm.org/otalk/stanza.io)
[![devDependency Status](https://david-dm.org/otalk/stanza.io/dev-status.png)](https://david-dm.org/otalk/stanza.io#info=devDependencies)

<!--[![Browser Support](https://ci.testling.com/otalk/stanza.io.png)](https://ci.testling.com/otalk/stanza.io)-->

## What is this?

Stanza.io is a library for using modern XMPP in the browser, and it does that by exposing everything as JSON. Unless you insist, you
have no need to ever see or touch any XML when using stanza.io.

## Important Protocol Changes

Starting with `v4.0.0`, stanza.io is using the protocol specified in [RFC 7395](http://tools.ietf.org/html/rfc7395) by default, which contains backwards incompatible changes.

Servers have started switching to using the RFC version of the WebSocket binding; notably, Prosody's WebSocket module for `prosody-0.10`. If your server has not yet been upgraded, you can set `transports` to `['old-websocket']` in the config:

```javascript
var oldws = XMPP.createClient({
    ...
    transports: ['old-websocket']
});
```

## Stanza Definitions Moved

As of `v7.3.0`, the XML/JSON mapping definitions have been split out into the [jxt-xmpp module](https://github.com/otalk/jxt-xmpp) to allow their use outside of stanza.io itself.

## Installing

```sh
$ npm install stanza.io

```
## Building bundled/minified version (for AMD, etc)

First run `npm install` to get all of the dependencies, and then run `make`:

```sh
$ npm install
$ make
```

The bundled and minified files will be in the generated `build` directory.

## Getting Started

1. Find or install a server which supports XMPP over WebSocket (Prosody recommended).
2. Run `npm install` in the `node_modules/stanza.io` directory.
3. Run `make` to build `build/stanzaio.bundle.js`.
4. Open `demo.html` in your browser.
5. Enter your connection info, click connect.
6. Use the JS console to play with the XMPP client (`var client`).

## Echo Client Demo

```javascript
var XMPP = require('stanza.io'); // if using browserify

var client = XMPP.createClient({
    jid: 'echobot@example.com',
    password: 'hunter2',

    // If you have a .well-known/host-meta.json file for your
    // domain, the connection transport config can be skipped.

    transport: 'websocket',
    wsURL: 'wss://example.com:5281/xmpp-websocket'
    // (or `boshURL` if using 'bosh' as the transport)
});

client.on('session:started', function () {
    client.getRoster();
    client.sendPresence();
});

client.on('chat', function (msg) {
    client.sendMessage({
      to: msg.from,
      body: 'You sent: ' + msg.body
    });
});

client.connect();
```

## Documentation

- [API Reference](docs/Reference.md)
- [Supported XEPs](docs/Supported_XEPs.md)
- [Creating Plugins](docs/Create_Plugin.md)
- [Using PubSub](docs/Using_Pubsub.md)

## License

MIT

## Created By

If you like this, follow [@lancestout](http://twitter.com/lancestout) on twitter.
