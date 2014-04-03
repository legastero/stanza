"use strict";

var stanzas = require('../stanza/reach');

module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:reach:0');
    client.disco.addFeature('urn:xmpp:reach:0+notify');

    client.on('pubsubEvent', function (msg) {
        if (!msg.event._extensions.updated) return;
        if (msg.event.updated.node !== 'urn:xmpp:reach:0') return;

        client.emit('reachability', {
            jid: msg.from,
            addresses: msg.event.updated.published[0].reach
        });
    });

    client.on('presence', function (pres) {
        if (!pres.reach.length) return;

        client.emit('reachability', {
            jid: pres.from,
            addresses: pres.reach
        });
    });

    client.publishReachability = function (data, cb) {
        return this.publish('', 'urn:xmpp:reach:0', {
            reach: data
        }, cb);
    };
};
