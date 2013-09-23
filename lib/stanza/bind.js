var stanza = require('jxt');
var Iq = require('./iq');
var StreamFeatures = require('./streamFeatures');
var util = require('./util');

var NS = 'urn:ietf:params:xml:ns:xmpp-bind';

var Bind = module.exports = stanza.define({
    name: 'bind',
    namespace: NS,
    element: 'bind',
    fields: {
        resource: stanza.subText(NS, 'resource'),
        jid: util.jidSub(NS, 'jid')
    }
});

stanza.extend(Iq, Bind);
stanza.extend(StreamFeatures, Bind);
