# Stanza.io
**Modern XMPP in the browser, with a JSON API.**

[![Build Status](https://travis-ci.org/legastero/stanza.io.png)](https://travis-ci.org/legastero/stanza.io)
[![Dependency Status](https://david-dm.org/legastero/stanza.io.png)](https://david-dm.org/legastero/stanza.io)
[![devDependency Status](https://david-dm.org/legastero/stanza.io/dev-status.png)](https://david-dm.org/legastero/stanza.io#info=devDependencies)

[![Browser Support](https://ci.testling.com/legastero/stanza.io.png)](https://ci.testling.com/legastero/stanza.io)

## What is this?

Stanza.io is a library for using modern XMPP in the browser, and it does that by exposing everything as JSON. Unless you insist, you
have no need to ever see or touch any XML when using stanza.io.

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
2. Run `npm install` to build `stanza.io.js`
3. Open `demo.html` in your browser
4. Enter your connection info, click connect.
5. Use the JS console to play with the XMPP client (var client).

If you want to see stanza.io in action in a full-featured client, take a look at [Otalk.im](http://otalk.im) (and its [source](https://github.com/andyet/otalk)).

## License

MIT

## Created By

If you like this, follow [@lancestout](http://twitter.com/lancestout) on twitter.
