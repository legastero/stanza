var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var JID = require('../jid');


function Presence(data, xml) {
    return stanza.init(this, xml, data);
}
Presence.prototype = {
    constructor: {
        value: Presence
    },
    _name: 'presence',
    NS: 'jabber:client',
    EL: 'presence',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang() {
        return this.xml.getAttributeNS(stanza.XML_NS, 'lang') || '';
    },
    set lang(value) {
        this.xml.setAttributeNS(stanza.XML_NS, 'lang', value);
    },
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get to() {
        return new JID(stanza.getAttribute(this.xml, 'to'));
    },
    set to(value) {
        stanza.setAttribute(this.xml, 'to', value.toString());
    },
    get from() {
        return new JID(stanza.getAttribute(this.xml, 'from'));
    },
    set from(value) {
        stanza.setAttribute(this.xml, 'from', value.toString());
    },
    get type() {
        return stanza.getAttribute(this.xml, 'type', 'available');
    },
    set type(value) {
        if (value === 'available') {
            value = false;
        }
        stanza.setAttribute(this.xml, 'type', value);
    },
    get status() {
        var statuses = this.$status;
        return statuses[this.lang] || '';
    },
    get $status() {
        return stanza.getSubLangText(this.xml, this.NS, 'status', this.lang);
    },
    set status(value) {
        stanza.setSubLangText(this.xml, this.NS, 'status', value, this.lang);
    },
    get priority() {
        return stanza.getSubText(this.xml, this.NS, 'priority');
    },
    set priority(value) {
        stanza.setSubText(this.xml, this.NS, 'priority', value);
    },
    get show() {
        return stanza.getSubText(this.xml, this.NS, 'show');
    },
    set show(value) {
        stanza.setSubText(this.xml, this.NS, 'show', value);
    }
};

stanza.topLevel(Presence);


module.exports = Presence;
