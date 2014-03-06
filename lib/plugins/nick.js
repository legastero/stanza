"use strict";

var stanza = require('../stanza/nick');
var NS = 'http://jabber.org/protocol/nick';


module.exports = function (client) {
    client.disco.addFeature(NS);
    client.disco.addFeature(NS + '+notify');

    client.on('pubsubEvent', function (msg) {
        if (!msg.event._extensions.updated) return;
        if (msg.event.updated.node !== NS) return;

        client.emit('nick', {
            jid: msg.from,
            nick: msg.event.updated.published[0].nick
        });
    });

    client.publishNick = function (nick, cb) {
        return this.publish('', NS, {
            nick: nick
        }, cb);
    };
};
