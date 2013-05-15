var stanza = require('./stanza');


function Iq(data, xml) {
    return stanza.init(this, xml, data);
}
Iq.prototype = {
    constructor: {
        value: Iq 
    },
    _name: 'iq',
    NS: 'jabber:client',
    EL: 'iq',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    resultReply: function (data) {
        data.to = this.from;
        data.id = this.id;
        data.type = 'result';
        return new Iq(data);
    },
    errorReply: function (data) {
        data.to = this.from;
        data.id = this.id;
        data.type = 'error';
        return new Iq(data);
    },
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
    }
};

stanza.topLevel(Iq);


exports.Iq = Iq;
