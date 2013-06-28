var stanza = require('./stanza');
var Iq = require('./iq');
var StreamFeatures = require('./streamFeatures');


function Session(data, xml) {
    return stanza.init(this, xml, data);
}
Session.prototype = {
    constructor: {
        value: Session
    },
    _name: 'session',
    NS: 'urn:ietf:params:xml:ns:xmpp-session',
    EL: 'session',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(StreamFeatures, Session);
stanza.extend(Iq, Session);


module.exports = Session;
