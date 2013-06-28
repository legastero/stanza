var stanza = require('./stanza');
var Presence = require('./presence');
var StreamFeatures = require('./streamFeatures');


function Caps(data, xml) {
    return stanza.init(this, xml, data);
}
Caps.prototype = {
    constructor: {
        value: Caps 
    },
    NS: 'http://jabber.org/protocol/caps',
    EL: 'c',
    _name: 'caps',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get ver() {
        return this.xml.getAttribute('ver') || '';
    },
    set ver(value) {
        this.xml.setAttribute('ver', value);
    },
    get node() {
        return this.xml.getAttribute('node') || '';
    },
    set node(value) {
        this.xml.setAttribute('node', value);
    },
    get hash() {
        return this.xml.getAttribute('hash') || '';
    },
    set hash(value) {
        this.xml.setAttribute('hash', value);
    },
    get ext() {
        return this.xml.getAttribute('ext') || '';
    },
    set ext(value) {
        this.xml.setAttribute('ext', value);
    }
};


stanza.extend(Presence, Caps);
stanza.extend(StreamFeatures, Caps);


module.exports = Caps;
