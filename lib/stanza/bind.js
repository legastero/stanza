var stanza = require('./stanza'),
    Iq = require('./iq').Iq,
    StreamFeatures = require('./streamFeatures').StreamFeatures;


function Bind(data, xml) {
    return stanza.init(this, xml, data);
}
Bind.prototype = {
    constructor: {
        value: Bind
    },
    name: 'bind',
    NS: 'urn:ietf:params:xml:ns:xmpp-bind',
    EL: 'bind',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get resource () {
        return stanza.getSubText(this.xml, this.NS, 'resource');
    },
    set resource (value) {
        stanza.setSubText(this.xml, this.NS, 'resource');
    },
    get jid () {
        return stanza.getSubText(this.xml, this.NS, 'jid');
    },
    set jid (value) {
        stanza.setSubText(this.xml, this.NS, 'jid');
    }
};


stanza.extend(Iq, Bind);
stanza.extend(StreamFeatures, Bind);


exports.Bind = Bind;
