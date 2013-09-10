var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var JID = require('../jid');


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
    get from() {
        return new JID(stanza.getAttribute(this.xml, 'from'));
    },
    set from(value) {
        stanza.setAttribute(this.xml, 'from', value.toString());
    },
    get stamp() {
        return new Date(stanza.getAttribute(this.xml, 'stamp') || Date.now());
    },
    set stamp(value) {
        stanza.setAttribute(this.xml, 'stamp', value.toISOString());
    },
    get reason() {
        return this.xml.textContent || '';
    },
    set reason(value) {
        this.xml.textContent = value;
    }
};


stanza.extend(Message, DelayedDelivery);
stanza.extend(Presence, DelayedDelivery);


module.exports = DelayedDelivery;
