var stanza = require('./stanza'),
    Message = require('./message');


function Request(data, xml) {
    return stanza.init(this, xml, data);
}
Request.prototype = {
    constructor: {
        value: Request
    },
    NS: 'urn:xmpp:receipts',
    EL: 'request',
    _name: '_requestReceipt',
    toString: stanza.toString,
    toJSON: undefined
};


function Received(data, xml) {
    return stanza.init(this, xml, data);
}
Received.prototype = {
    constructor: {
        value: Received 
    },
    NS: 'urn:xmpp:receipts',
    EL: 'received',
    _name: 'receipt',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get id() {
        return this.xml.getAttribute('id') || '';
    },
    set id(value) {
        this.xml.setAttribute('id', value);
    }
};


Message.prototype.__defineGetter__('requestReceipt', function () {
    return !!this._extensions._requestReceipt;
});
Message.prototype.__defineSetter__('requestReceipt', function (value) {    
    if (value) {
        this._requestReceipt = true;
    } else if (this._extensions._requestReceipt) {
        this.xml.removeChild(this._extensions._requestReceipt.xml);
        delete this._extensions._requestReceipt;
    }
});


stanza.extend(Message, Received);
stanza.extend(Message, Request);

exports.Request = Request;
exports.Received = Received;
