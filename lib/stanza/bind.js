var stanza = require('jxt');
var Iq = require('./iq');
var StreamFeatures = require('./streamFeatures');
var JID = require('../jid');


function Bind(data, xml) {
    return stanza.init(this, xml, data);
}
Bind.prototype = {
    constructor: {
        value: Bind
    },
    _name: 'bind',
    NS: 'urn:ietf:params:xml:ns:xmpp-bind',
    EL: 'bind',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get resource() {
        return stanza.getSubText(this.xml, this.NS, 'resource');
    },
    set resource(value) {
        stanza.setSubText(this.xml, this.NS, 'resource', value);
    },
    get jid() {
        return new JID(stanza.getSubText(this.xml, this.NS, 'jid'));
    },
    set jid(value) {
        stanza.setSubText(this.xml, this.NS, 'jid', value.toString());
    }
};


stanza.extend(Iq, Bind);
stanza.extend(StreamFeatures, Bind);


module.exports = Bind;
