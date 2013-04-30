var _ = require('../lodash'),
    stanza = require('./stanza');


function Presence(data, xml) {
    return stanza.init(this, xml, data);
}
Presence.prototype = {
    constructor: {
        value: Presence
    },
    name: 'presence',
    NS: 'jabber:client',
    EL: 'presence',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang () {
        return this.xml.getAttributeNS(stanza.XML_NS, 'lang') || '';
    },
    set lang (value) {
        this.xml.setAttributeNS(stanza.XML_NS, 'lang', value);
    },
    get id () {
        return this.xml.getAttribute('id') || '';
    },
    set id (value) {
        this.xml.setAttribute('id', value);
    },
    get to () {
        return this.xml.getAttribute('to') || '';
    },
    set to (value) {
        this.xml.setAttribute('to', value);
    },
    get from () {
        return this.xml.getAttribute('from') || '';
    },
    set from (value) {
        this.xml.setAttribute('from', value);
    },
    get type () {
        return this.xml.getAttribute('type') || '';
    },
    set type (value) {
        this.xml.setAttribute('type', value);
    },
    get status () {
        var statuses = this.$status;
        return statuses[this.lang] || '';
    },
    get $status () {
        return stanza.getSubLangText(this.xml, this.NS, 'status', this.lang);
    },
    set status (value) {
        stanza.setSubLangText(this.xml, this.NS, 'status', value, this.lang);
    },
    get priority () {
        return stanza.getSubText(this.xml, this.NS, 'priority');
    },
    set priority (value) {
        stanza.setSubText(this.xml, this.NS, 'priority', value);
    },
    get show () {
        return stanza.getSubText(this.xml, this.NS, 'show');
    },
    set show (value) {
        stanza.setSubText(this.xml, this.NS, 'show', value);
    }
};

stanza.topLevel(Presence);


exports.Presence = Presence;
