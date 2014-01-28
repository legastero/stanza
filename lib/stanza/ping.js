var stanza = require('jxt');
var Iq = require('./iq');

var NS = 'urn:xmpp:ping';

var Ping = module.exports = stanza.define({
    name: 'ping',
    namespace: NS,
    element: 'ping',
    fields: {
    }
});

stanza.extend(Iq, Ping);
