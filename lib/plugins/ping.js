"use strict";

var stanzas = require('../stanza/ping');

module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:ping');

    client.on('iq:get:ping', function (iq) {
        client.sendIq(iq.resultReply());
    });

    client.ping = function (jid, cb) {
        return this.sendIq({
            to: jid,
            type: 'get',
            ping: {}
        });
    };
};
