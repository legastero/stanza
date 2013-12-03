"use strict";

var Jingle = require('jingle');

var stanza = require('../stanza/jingle');
var rtp = require('../stanza/rtp');
var ice = require('../stanza/iceUdp');


module.exports = function (client) {
    var jingle = client.jingle = new Jingle();

    jingle.capabilities.forEach(function (cap) {
        client.disco.addFeature(cap);
    });

    var mappedEvents = [
        'outgoing', 'incoming', 'accepted', 'terminated',
        'ringing', 'mute', 'unmute', 'hold', 'resumed'
    ];
    mappedEvents.forEach(function (event) {
        jingle.on(event, function (session, arg1) {
            client.emit('jingle:' + event, session, arg1);
        });
    });

    jingle.on('localStream', function (stream) {
        client.emit('jingle:localstream:added', stream);
    });

    jingle.on('localStreamStopped', function () {
        client.emit('jingle:localstream:removed');
    });

    jingle.on('peerStreamAdded', function (session) {
        client.emit('jingle:remotestream:added', session);
    });

    jingle.on('peerStreamRemoved', function (session) {
        client.emit('jingle:remotestream:removed', session);
    });

    jingle.on('send', function (data) {
        client.sendIq(data);
    });

    client.on('iq:set:jingle', function (data) {
        data = data.toJSON();
        jingle.process(data);
    });

    client.on('unavailable', function (pres) {
        var peer = pres.from.full;
        jingle.endPeerSessions(peer);
    });

    client.call = function (peer) {
        peer = peer.full || peer;
        var sess = jingle.createMediaSession(peer);
        client.sendPresence({to: peer});
        sess.start();
        return sess;
    };

    client.discoverICEServers = function (cb) {
        client.getServices(client.config.server, null, function (err, res) {
            if (err) return cb(err);

            var services = res.services.services;
            var discovered = [];

            for (var i = 0; i < services.length; i++) {
                var service = services[i];
                var ice = {};
                if (service.type === 'stun') {
                    ice.url = 'stun:' + service.host;
                    if (service.port) {
                        ice.url += ':' + service.port;
                    }
                    discovered.push(ice);
                    client.jingle.addICEServer(ice);
                } else if (service.type === 'turn') {
                    ice.url = 'turn:' + service.host;
                    if (service.port) {
                        ice.url += ':' + service.port;
                    }
                    if (service.transport && service.transport !== 'udp') {
                        ice.url += '?transport=' + service.transport;
                    }

                    if (service.username) {
                        ice.username = service.username;
                    }
                    if (service.password) {
                        ice.credential = service.password;
                    }
                    discovered.push(ice);
                    client.jingle.addICEServer(ice);
                }
            }
            cb(null, discovered);
        });
    };
};
