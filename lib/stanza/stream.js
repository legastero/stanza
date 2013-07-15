var stanza = require('jxt');


function Stream(data, xml) {
    return stanza.init(this, xml, data);
}
Stream.prototype = {
    constructor: {
        value: Stream
    },
    _name: 'stream',
    NS: 'http://etherx.jabber.org/streams',
    EL: 'stream',
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
    get version() {
        return stanza.getAttribute(this.xml, 'version', '1.0');
    },
    set version(value) {
        stanza.setAttribute(this.xml, 'version', value);
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
    }
}; 

module.exports = Stream;
