var stanza = require('./stanza');


function StreamFeatures(data, xml) {
    return stanza.init(this, xml, data);
}
StreamFeatures.prototype = {
    constructor: {
        value: StreamFeatures
    },
    _name: 'streamFeatures',
    NS: 'http://etherx.jabber.org/streams',
    EL: 'features',
    _FEATURES: [],
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get features () {
        return this._extensions;
    }
};

stanza.topLevel(StreamFeatures);


exports.StreamFeatures = StreamFeatures;
