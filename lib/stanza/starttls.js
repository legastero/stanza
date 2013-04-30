var stanza = require('./stanza'),
    StreamFeatures = require('./streamFeatures').StreamFeatures;


function StartTLS(data, xml) {
    return stanza.init(this, xml, data);
}
StartTLS.prototype = {
    constructor: {
        value: StartTLS
    },
    name: 'starttls',
    NS: 'urn:ietf:params:xml:ns:xmpp-tls',
    EL: 'starttls',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get required () {
    },
    set required (value) {
    }
};


function Proceed(data, xml) {
    return stanza.init(this, xml, data);
}
Proceed.prototype = {
    constructor: {
        value: Proceed 
    },
    name: 'tlsProceed',
    NS: 'urn:ietf:params:xml:ns:xmpp-tls',
    EL: 'proceed',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Failure(data, xml) {
    return stanza.init(this, xml, data);
}
Failure.prototype = {
    constructor: {
        value: Failure 
    },
    name: 'tlsFailure',
    NS: 'urn:ietf:params:xml:ns:xmpp-tls',
    EL: 'failure',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(StreamFeatures, StartTLS, 'starttls');
stanza.topLevel(StartTLS);
stanza.topLevel(Proceed);
stanza.topLevel(Failure);


exports.StartTLS = StartTLS;
exports.Proceed = Proceed;
exports.Failure = Failure;
