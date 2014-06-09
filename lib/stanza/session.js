var stanza = require('jxt');
var Iq = require('./iq');
var StreamFeatures = require('./streamFeatures');

var NS = 'urn:ietf:params:xml:ns:xmpp-session';

var Session = module.exports = stanza.define({
    name: 'session',
    namespace: NS,
    element: 'session',
    fields: {
        required: stanza.boolSub(NS, 'required'),
        optional: stanza.boolSub(NS, 'optional')
    }
});

stanza.extend(StreamFeatures, Session);
stanza.extend(Iq, Session);
