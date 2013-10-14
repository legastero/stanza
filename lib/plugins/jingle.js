var Jingle = require('jingle');

var stanza = require('../stanza/jingle');
var rtp = require('../stanza/rtp');
var ice = require('../stanza/iceUdp');


module.exports = function (client) {
    var jingle = client.jingle = new Jingle();

    jingle.capabilities.forEach(function (cap) {
        client.disco.addFeature(cap);
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

    jingle.on('incoming', function (session) {
        client.emit('jingle:incoming', session);
    });

    jingle.on('outgoing', function (session) {
        client.emit('jingle:outgoing', session);
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
};
