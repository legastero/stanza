var stanza = require('jxt');
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
        return stanza.getAttribute(this.xml, 'ver');
    },
    set ver(value) {
        stanza.setAttribute(this.xml, 'ver', value);
    },
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get hash() {
        return stanza.getAttribute(this.xml, 'hash');
    },
    set hash(value) {
        stanza.setAttribute(this.xml, 'hash', value);
    },
    get ext() {
        return stanza.getAttribute(this.xml, 'ext');
    },
    set ext(value) {
        stanza.setAttribute(this.xml, 'ext', value);
    }
};


stanza.extend(Presence, Caps);
stanza.extend(StreamFeatures, Caps);


module.exports = Caps;
