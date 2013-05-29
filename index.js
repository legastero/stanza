exports.stanza = require('./lib/stanza/stanza');
exports.Stream = require('./lib/stanza/stream').Stream;
exports.Message = require('./lib/stanza/message').Message;
exports.Presence = require('./lib/stanza/presence').Presence;
exports.Iq = require('./lib/stanza/iq').Iq;

exports.SOX = require('./lib/stanza/sox');

exports.Jingle = require('./lib/stanza/jingle');
exports.RTP = require('./lib/stanza/rtp.js');
exports.ICEUDP = require('./lib/stanza/iceUdp.js');


exports.Client = require('./lib/client').Client;
exports.createClient = function (opts) {
    var client = new exports.Client(opts);

    client.use(require('./lib/plugins/disco').init);
    client.use(require('./lib/plugins/chatstates').init);
    client.use(require('./lib/plugins/delayed').init);
    client.use(require('./lib/plugins/forwarding').init);
    client.use(require('./lib/plugins/carbons').init);
    client.use(require('./lib/plugins/time').init);
    client.use(require('./lib/plugins/mam').init);
    client.use(require('./lib/plugins/webrtc').init);

    return client;
};

window.XMPP = exports;
