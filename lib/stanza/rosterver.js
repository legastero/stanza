var stanza = require('./stanza');


function RosterVerFeature(data, xml) {
    return stanza.init(this, xml, data);
}
RosterVerFeature.prototype = {
    constructor: {
        value: Session
    },
    name: 'rosterVersioningFeature',
    NS: 'urn:xmpp:features:rosterver',
    EL: 'ver',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


exports.RosterVerFeature = RosterVerFeature;
