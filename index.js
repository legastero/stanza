"use strict";

exports.Message = require('./lib/stanza/message');
exports.Presence = require('./lib/stanza/presence');
exports.Iq = require('./lib/stanza/iq');

exports.Client = require('./lib/client');
exports.crypto = require('crypto');

exports.createClient = function (opts) {
    var client = new exports.Client(opts);

    client.use(require('./lib/plugins/disco'));
    client.use(require('./lib/plugins/chatstates'));
    client.use(require('./lib/plugins/delayed'));
    client.use(require('./lib/plugins/forwarding'));
    client.use(require('./lib/plugins/carbons'));
    client.use(require('./lib/plugins/time'));
    client.use(require('./lib/plugins/mam'));
    client.use(require('./lib/plugins/receipts'));
    client.use(require('./lib/plugins/idle'));
    client.use(require('./lib/plugins/correction'));
    client.use(require('./lib/plugins/attention'));
    client.use(require('./lib/plugins/version'));
    client.use(require('./lib/plugins/invisible'));
    client.use(require('./lib/plugins/muc'));
    client.use(require('./lib/plugins/pubsub'));
    client.use(require('./lib/plugins/avatar'));
    client.use(require('./lib/plugins/private'));
    client.use(require('./lib/plugins/bookmarks'));
    client.use(require('./lib/plugins/jingle'));
    client.use(require('./lib/plugins/json'));
    client.use(require('./lib/plugins/hashes'));
    client.use(require('./lib/plugins/extdisco'));
    client.use(require('./lib/plugins/geoloc'));
    client.use(require('./lib/plugins/vcard'));
    client.use(require('./lib/plugins/oob'));

    return client;
};
