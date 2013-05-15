var stanza = require('./stanza'),
    Iq = require('./iq').Iq;


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
    toJSON: stanza.toJSON,
    extensions: {}
};


stanza.extend(Iq, Session, 'session');


exports.Session = Session;
