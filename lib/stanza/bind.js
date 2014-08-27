var stanza = require('jxt');
var Iq = require('./iq');
var StreamFeatures = require('./streamFeatures');
var jxtutil = require('jxt-xmpp-types');

var NS = 'urn:ietf:params:xml:ns:xmpp-bind';

var Bind = module.exports = stanza.define({
    name: 'bind',
    namespace: NS,
    element: 'bind',
    fields: {
        resource: stanza.subText(NS, 'resource'),
        jid: jxtutil.jidSub(NS, 'jid')
    }
});

stanza.extend(Iq, Bind);
stanza.extend(StreamFeatures, Bind);
