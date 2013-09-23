var stanza = require('jxt');
var Iq = require('./iq');
var StreamFeatures = require('./streamFeatures');

var Session = module.exports = stanza.define({
    name: 'session',
    namespace: 'urn:ietf:params:xml:ns:xmpp-session',
    element: 'session'
});

stanza.extend(StreamFeatures, Session);
stanza.extend(Iq, Session);
