var stanza = require('jxt');


function RSM(data, xml) {
    return stanza.init(this, xml, data);
}
RSM.prototype = {
    constructor: {
        value: RSM 
    },
    NS: 'http://jabber.org/protocol/rsm',
    EL: 'set',
    _name: 'rsm',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get after() {
        return stanza.getSubText(this.xml, this.NS, 'after');
    },
    set after(value) {
        stanza.setSubText(this.xml, this.NS, 'after', value);
    },
    get before() {
        return stanza.getSubText(this.xml, this.NS, 'before');
    },
    set before(value) {
        if (value === true) {
            stanza.findOrCreate(this.xml, this.NS, 'before');
        } else {
            stanza.setSubText(this.xml, this.NS, 'before', value);
        }
    },
    get count() {
        return parseInt(stanza.getSubText(this.xml, this.NS, 'count') || '0', 10);
    },
    set count(value) {
        stanza.setSubText(this.xml, this.NS, 'count', value.toString());
    },
    get first() {
        return stanza.getSubText(this.xml, this.NS, 'first');
    },
    set first(value) {
        stanza.setSubText(this.xml, this.NS, 'first', value);
    },
    get firstIndex() {
        return stanza.getSubAttribute(this.xml, this.NS, 'first', 'index');
    },
    set firstIndex(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'first', 'index', value);
    },
    get index() {
        return stanza.getSubText(this.xml, this.NS, 'index');
    },
    set index(value) {
        stanza.setSubText(this.xml, this.NS, 'index', value);
    },
    get last() {
        return stanza.getSubText(this.xml, this.NS, 'last');
    },
    set last(value) {
        stanza.setSubText(this.xml, this.NS, 'last', value);
    },
    get max() {
        return stanza.getSubText(this.xml, this.NS, 'max');
    },
    set max(value) {
        stanza.setSubText(this.xml, this.NS, 'max', value.toString());
    }
};


module.exports = RSM;
