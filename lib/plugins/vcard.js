"use strict";

var stanzas = require('../stanza/vcard');

module.exports = function (client) {
    client.disco.addFeature('vcard-temp');

    client.getVCard = function (jid, cb) {
        client.sendIq({
            to: jid,
            type: 'get',
            vCardTemp: {}
        }, cb);
    };

    client.publishVCard = function (vcard, cb) {
        client.sendIq({
            type: 'set',
            vCardTemp: vcard
        }, cb);
    };
};
