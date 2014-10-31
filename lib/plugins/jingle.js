'use strict';

var Jingle = require('jingle');
var JingleMediaSession = require('jingle-media-session');
var JingleFileTransferSession = require('jingle-filetransfer-session');


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/jingle'));
    stanzas.use(require('../stanza/rtp'));
    stanzas.use(require('../stanza/iceUdp'));
    stanzas.use(require('../stanza/file'));


    var jingle = client.jingle = new Jingle({
        jid: client.jid,
        prepareSession: function (opts) {
            if (opts.descriptionTypes.indexOf('rtp') >= 0) {
                return new JingleMediaSession(opts);
            }
            if (opts.descriptionTypes.indexOf('filetransfer') >= 0) {
                return new JingleFileTransferSession(opts);
            }
        }
    });

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

    jingle.on('createdSession', function (session) {
        client.emit('jingle:created', session);
    });

    jingle.on('peerStreamAdded', function (session, stream) {
        client.emit('jingle:remotestream:added', session, stream);
    });

    jingle.on('peerStreamRemoved', function (session, stream) {
        client.emit('jingle:remotestream:removed', session, stream);
    });

    jingle.on('send', function (data) {
        client.sendIq(data, function (err) {
            if (err) {
                client.emit('jingle:error', err);
            }
        });
    });

    client.on('iq:set:jingle', function (data) {
        jingle.process(data);
    });

    client.on('unavailable', function (pres) {
        var peer = pres.from.full;
        jingle.endPeerSessions(peer, true);
    });

    client.discoverICEServers = function (cb) {
        return this.getServices(client.config.server).then(function (res) {
            var services = res.services.services;
            var discovered = [];

            for (var i = 0; i < services.length; i++) {
                var service = services[i];
                var ice = {};
                if (service.type === 'stun' || service.type === 'stuns') {
                    ice.url = service.type + ':' + service.host;
                    if (service.port) {
                        ice.url += ':' + service.port;
                    }
                    discovered.push(ice);
                    client.jingle.addICEServer(ice);
                } else if (service.type === 'turn' || service.type === 'turns') {
                    ice.url = service.type + ':' + service.host;
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

            return discovered;
        }).nodeify(cb);
    };
};
