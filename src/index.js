'use strict';

exports.VERSION = '__STANZAIO_VERSION__';

exports.JID = require('xmpp-jid').JID;
exports.Client = require('./client');


exports.createClient = function (opts) {
    var client = new exports.Client(opts);
    client.use(require('./plugins'));

    return client;
};
