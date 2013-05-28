var stanza = require('./stanza'),
    Message = require('./message').Message,
    Presence = require('./presence').Presence,
    Iq = require('./iq').Iq,
    DelayedDelivery = require('./delayed').DelayedDelivery;


function Forwarded(data, xml) {
    return stanza.init(this, xml, data);
}
Forwarded.prototype = {
    constructor: {
        value: Forwarded 
    },
    NS: 'urn:xmpp:forward:0',
    EL: 'forwarded',
    _name: 'forwarded',
    _eventname: 'forward',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(Message, Forwarded);
stanza.extend(Forwarded, Message);
stanza.extend(Forwarded, Presence);
stanza.extend(Forwarded, Iq);
stanza.extend(Forwarded, DelayedDelivery);


exports.Forwarded = Forwarded;
