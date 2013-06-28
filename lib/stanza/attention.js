var stanza = require('jxt');
var Message = require('./message');


function Attention(data, xml) {
    return stanza.init(this, xml, data);
}
Attention.prototype = {
    constructor: {
        value: Attention 
    },
    NS: 'urn:xmpp:attention:0',
    EL: 'attention',
    _name: '_attention',
    toString: stanza.toString,
    toJSON: undefined
};

Message.prototype.__defineGetter__('attention', function () {
    return !!this._extensions._attention;
});
Message.prototype.__defineSetter__('attention', function (value) {    
    if (value) {
        this._attention = true;
    } else if (this._extensions._attention) {
        this.xml.removeChild(this._extensions._attention.xml);
        delete this._extensions._attention;
    }
});


stanza.extend(Message, Attention);

module.exports = Attention;
