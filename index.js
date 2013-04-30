var padlock = require('padlock');

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


exports.Client = require('./lib/client').Client;
exports.createClient = require('./lib/client').createClient;


window.XMPP = exports;
