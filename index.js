'use strict';

exports.Stream = require('./lib/stanza/stream');
exports.BOSH = require('./lib/stanza/bosh');
exports.Message = require('./lib/stanza/message');
exports.Presence = require('./lib/stanza/presence');
exports.Iq = require('./lib/stanza/iq');

exports.PubsubEvent = require('./lib/stanza/pubsubEvents').EventItem;
exports.PubsubItem = require('./lib/stanza/pubsub').Item;

exports.JID = require('./lib/jid');

exports.Client = require('./lib/client');
exports.crypto = require('crypto');
exports.jxt = require('jxt');


exports.createClient = function (opts) {
    var client = new exports.Client(opts);
    client.use(require('./lib/plugins'));

    return client;
};
