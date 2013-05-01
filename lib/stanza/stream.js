var stanza = require('./stanza');


function Stream(data, xml) {
    return stanza.init(this, xml, data);
}
Stream.prototype = {
    constructor: {
        value: Stream
    },
    name: 'stream',
    NS: 'http://etherx.jabber.org/streams',
    EL: 'stream',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang() {
        return this.xml.getAttributeNS(stanza.XML_NS, 'lang') || '';
    },
    set lang (value) {
        this.xml.setAttributeNS(stanza.XML_NS, 'lang', value);
    },
    get id() {
        return this.xml.getAttribute('id') || '';
    },
    set id(value) {
        this.xml.setAttribute('id', value);
    },
    get version () {
        return this.xml.getAttribute('version') || '1.0';
    },
    set version (value) {
        this.xml.setAttribute('version', value);
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
    }
}; 

exports.Stream = Stream;
