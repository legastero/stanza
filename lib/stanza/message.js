var _ = require('lodash');
var stanza = require('./stanza');


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
        return this.xml.getAttribute('id') || '';
    },
    set id(value) {
        this.xml.setAttribute('id', value);
    },
    get to() {
        return this.xml.getAttribute('to') || '';
    },
    set to(value) {
        this.xml.setAttribute('to', value);
    },
    get from() {
        return this.xml.getAttribute('from') || '';
    },
    set from(value) {
        this.xml.setAttribute('from', value);
    },
    get type() {
        return this.xml.getAttribute('type') || 'normal';
    },
    set type(value) {
        this.xml.setAttribute('type', value);
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
        var threads = stanza.find(this.xml, this.NS, 'thread');
            
        if (!threads.length) {
            return '';
        }

        return threads[0].getAttribute('parent') || '';
    },
    set parentThread(value) {
        var threads = stanza.find(this.xml, this.NS, 'thread');
        if (!threads.length) {
            if (!value) {
                return;
            }
            var thread = document.createElementNS(this.NS, 'thread');
            thread.setAttribute('parent', value);
            this.xml.appendChild(thread);
        } else {
            if (value) {
                threads[0].setAttribute('parent', value);
            } else {
                threads[0].removeAttribute('parent');
            }
        }
    }
};

stanza.topLevel(Message);


module.exports = Message;
