var stanza = require('jxt');
var Message = require('./message');
var Iq = require('./iq');
var Forwarded = require('./forwarded');


function Sent(data, xml) {
    return stanza.init(this, xml, data);
}
Sent.prototype = {
    constructor: {
        value: Sent
    },
    NS: 'urn:xmpp:carbons:2',
    EL: 'sent',
    _name: 'carbonSent',
    _eventname: 'carbon:sent',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Received(data, xml) {
    return stanza.init(this, xml, data);
}
Received.prototype = {
    constructor: {
        value: Received
    },
    NS: 'urn:xmpp:carbons:2',
    EL: 'received',
    _name: 'carbonReceived',
    _eventname: 'carbon:received',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Private(data, xml) {
    return stanza.init(this, xml, data);
}
Private.prototype = {
    constructor: {
        value: Private 
    },
    NS: 'urn:xmpp:carbons:2',
    EL: 'private',
    _name: 'carbonPrivate',
    _eventname: 'carbon:private',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Enable(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Enable
    },
    NS: 'urn:xmpp:carbons:2',
    EL: 'enable',
    _name: 'enableCarbons',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Disable(data, xml) {
    return stanza.init(this, xml, data);
}
Disable.prototype = {
    constructor: {
        value: Disable
    },
    NS: 'urn:xmpp:carbons:2',
    EL: 'disable',
    _name: 'disableCarbons',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(Sent, Forwarded);
stanza.extend(Received, Forwarded);
stanza.extend(Message, Sent);
stanza.extend(Message, Received);
stanza.extend(Message, Private);
stanza.extend(Iq, Enable);
stanza.extend(Iq, Disable);


exports.Sent = Sent;
exports.Received = Received;
exports.Private = Private;
exports.Enable = Enable;
exports.Disable = Disable;
