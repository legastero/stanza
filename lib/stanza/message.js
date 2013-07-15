var _ = require('lodash');
var stanza = require('jxt');


function Message(data, xml) {
    return stanza.init(this, xml, data);
}
Message.prototype = {
    constructor: {
        value: Message
    },
    _name: 'message',
    NS: 'jabber:client',
    EL: 'message',
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
        return stanza.getAttribute(this.xml, 'to');
    },
    set to(value) {
        stanza.setAttribute(this.xml, 'to', value);
    },
    get from() {
        return stanza.getAttribute(this.xml, 'from');
    },
    set from(value) {
        stanza.setAttribute(this.xml, 'from', value);
    },
    get type() {
        return stanza.getAttribute(this.xml, 'type', 'normal');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'type', value);
    },
    get body() {
        var bodies = this.$body;
        return bodies[this.lang] || '';
    },
    get $body() {
        return stanza.getSubLangText(this.xml, this.NS, 'body', this.lang);
    },
    set body(value) {
        stanza.setSubLangText(this.xml, this.NS, 'body', value, this.lang);
    },
    get thread() {
        return stanza.getSubText(this.xml, this.NS, 'thread');
    },
    set thread(value) {
        stanza.setSubText(this.xml, this.NS, 'thread', value);
    },
    get parentThread() {
        return stanza.getSubAttribute(this.xml, this.NS, 'thread', 'parent');
    },
    set parentThread(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'thread', 'parent', value);
    }
};

stanza.topLevel(Message);


module.exports = Message;
