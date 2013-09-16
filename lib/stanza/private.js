var stanza = require('jxt');
var Iq = require('./iq');


function PrivateStorage(data, xml) {
    return stanza.init(this, xml, data);
}
PrivateStorage.prototype = {
    constructor: {
        value: PrivateStorage
    },
    NS: 'jabber:iq:private',
    EL: 'query',
    _name: 'privateStorage',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(Iq, PrivateStorage);


module.exports = PrivateStorage;
