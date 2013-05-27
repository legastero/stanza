exports.stanza = require('./lib/stanza/stanza');
exports.Stream = require('./lib/stanza/stream').Stream;
exports.Message = require('./lib/stanza/message').Message;
exports.Presence = require('./lib/stanza/presence').Presence;
exports.Iq = require('./lib/stanza/iq').Iq;
exports.Error = require('./lib/stanza/error').Error;
exports.Roster = require('./lib/stanza/roster').Roster;

exports.StreamError = require('./lib/stanza/streamError').StreamError;
exports.StreamFeatures = require('./lib/stanza/streamFeatures').StreamFeatures;
exports.Bind = require('./lib/stanza/bind').Bind;
exports.Session = require('./lib/stanza/session').Session;
exports.SASL = require('./lib/stanza/sasl');
exports.TLS = require('./lib/stanza/starttls');

exports.SM = require('./lib/stanza/sm');

exports.ChatState = require('./lib/stanza/chatState.js');

exports.SOX = require('./lib/stanza/sox');

exports.Jingle = require('./lib/stanza/jingle');
exports.RTP = require('./lib/stanza/rtp.js');
exports.ICEUDP = require('./lib/stanza/iceUdp.js');


exports.Client = require('./lib/client').Client;
exports.createClient = function (opts) {
    var client = new exports.Client(opts);

    client.use(require('./lib/plugins/disco').init);
    client.use(require('./lib/plugins/chatstates').init);
    client.use(require('./lib/plugins/webrtc').init);

    return client;
};

window.XMPP = exports;
