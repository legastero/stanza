exports.stanza = require('./lib/stanza/stanza');
exports.Stream = require('./lib/stanza/stream');
exports.Message = require('./lib/stanza/message');
exports.Presence = require('./lib/stanza/presence');
exports.Iq = require('./lib/stanza/iq');

exports.SOX = require('./lib/stanza/sox');

exports.Jingle = require('./lib/stanza/jingle');
exports.RTP = require('./lib/stanza/rtp');
exports.ICEUDP = require('./lib/stanza/iceUdp');

exports.Client = require('./lib/client');
exports.createClient = function (opts) {
    var client = new exports.Client(opts);

    client.use(require('./lib/plugins/disco'));
    client.use(require('./lib/plugins/chatstates'));
    client.use(require('./lib/plugins/delayed'));
    client.use(require('./lib/plugins/forwarding'));
    client.use(require('./lib/plugins/carbons'));
    client.use(require('./lib/plugins/time'));
    client.use(require('./lib/plugins/mam'));
    client.use(require('./lib/plugins/receipts'));
    client.use(require('./lib/plugins/idle'));
    client.use(require('./lib/plugins/correction'));
    client.use(require('./lib/plugins/attention'));
    client.use(require('./lib/plugins/version'));
    client.use(require('./lib/plugins/invisible'));
    client.use(require('./lib/plugins/muc'));
    client.use(require('./lib/plugins/webrtc'));

    return client;
};

window.XMPP = exports;
