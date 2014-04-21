"use strict";

var stanzas = require('../stanza/geoloc');

module.exports = function (client) {
    client.disco.addFeature('http://jabber.org/protocol/geoloc');
    client.disco.addFeature('http://jabber.org/protocol/geoloc+notify');

    client.on('pubsub:event', function (msg) {
        if (!msg.event._extensions.updated) return;
        if (msg.event.updated.node !== 'http://jabber.org/protocol/geoloc') return;

        client.emit('geoloc', {
            jid: msg.from,
            geoloc: msg.event.updated.published[0].geoloc
        });
    });

    client.publishGeoLoc = function (data, cb) {
        return this.publish('', 'http://jabber.org/protocol/geoloc', {
            geoloc: data
        }, cb);
    };
};
