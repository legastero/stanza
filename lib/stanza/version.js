var stanza = require('./stanza');
var Iq = require('./iq');


function Version(data, xml) {
    return stanza.init(this, xml, data);
}
Version.prototype = {
    constructor: {
        value: Version 
    },
    NS: 'jabber:iq:version',
    EL: 'query',
    _name: 'version',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get name() {
        return stanza.getSubText(this.xml, this.NS, 'name');
    },
    set name(value) {
        stanza.setSubText(this.xml, this.NS, 'name', value);
    },
    get version() {
        return stanza.getSubText(this.xml, this.NS, 'version');
    },
    set version(value) {
        stanza.setSubText(this.xml, this.NS, 'version', value);
    },
    get os() {
        return stanza.getSubText(this.xml, this.NS, 'os');
    },
    set os(value) {
        stanza.setSubText(this.xml, this.NS, 'os', value);
    }
};


stanza.extend(Iq, Version);


module.exports = Version;
