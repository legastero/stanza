# Stanza.io
**Modern XMPP in the browser, with a JSON API.**

[![Build Status](https://travis-ci.org/legastero/stanza.io.png)](https://travis-ci.org/legastero/stanza.io)
[![Dependency Status](https://david-dm.org/legastero/stanza.io.png)](https://david-dm.org/legastero/stanza.io)
[![devDependency Status](https://david-dm.org/legastero/stanza.io/dev-status.png)](https://david-dm.org/legastero/stanza.io#info=devDependencies)

[![Browser Support](https://ci.testling.com/legastero/stanza.io.png)](https://ci.testling.com/legastero/stanza.io)

## What is this?

Stanza.io is a library for using modern XMPP in the browser, and it does that by exposing everything as JSON. Unless you insist, you
have no need to ever see or touch any XML when using stanza.io.

## Important Protocol Changes

Starting with `v4.0.0`, stanza.io is using the protocol specified in the [latest XMPP over WebSocket draft](http://tools.ietf.org/html/draft-ietf-xmpp-websocket-02), which contains backwards incompatible changes.

Servers have started switching to using the latest protocol; notably, Prosody's WebSocket module. If your server has not yet been upgraded, you will need to use a `3.x` version of stanza.io.

## Installing

```sh
$ npm install stanza.io
```

## Building bundled/minified version (for AMD, etc)

```sh
$ grunt
```

The bundled and minified files will be in the generated `build` directory.

## Getting Started

1. Find or install a server which supports XMPP over WebSocket (Prosody recommended).
2. Run `grunt` to build `build/stanzaio.bundle.js`
3. Open `demo.html` in your browser
4. Enter your connection info, click connect.
5. Use the JS console to play with the XMPP client (`var client`).

If you want to see stanza.io in action in a full-featured client, take a look at [Otalk.im](http://otalk.im) (and its [source](https://github.com/andyet/otalk)).

## Echo Client Demo

```javascript
var XMPP = require('stanza.io'); // if using browserify

var client = XMPP.createClient({
    jid: 'echobot@example.com',
    password: 'hunter2'
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

## License

MIT

## Created By

If you like this, follow [@lancestout](http://twitter.com/lancestout) on twitter.
