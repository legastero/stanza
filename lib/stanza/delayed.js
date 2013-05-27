var stanza = require('./stanza'),
    Message = require('./message').Message,
    Presence = require('./presence').Presence;


function DelayedDelivery(data, xml) {
    return stanza.init(this, xml, data);
}
DelayedDelivery.prototype = {
    constructor: {
        value: DelayedDelivery
    },
    NS: 'urn:xmpp:delay',
    EL: 'delay',
    _name: 'delay',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get from () {
        return this.xml.getAttribute('from') || '';
    },
    set from (value) {
        this.xml.setAttribute('from', value);
    },
    get stamp () {
        return new Date(this.xml.getAttribute('stamp') || '');
    },
    set stamp (value) {
        this.xml.setAttribute('stamp', value.toISOString());
    },
    get reason () {
        return this.xml.textContent || '';
    },
    set reason (value) {
        this.xml.textContent = value;
    }
};


stanza.extend(Message, DelayedDelivery);
stanza.extend(Presence, DelayedDelivery);


exports.DelayedDelivery = DelayedDelivery;
