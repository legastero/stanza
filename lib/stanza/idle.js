var stanza = require('./stanza'),
    Presence = require('./presence');


function Idle(data, xml) {
    return stanza.init(this, xml, data);
}
Idle.prototype = {
    constructor: {
        value: Idle 
    },
    NS: 'urn:xmpp:idle:0',
    EL: 'idle',
    _name: 'idle',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get since() {
        return new Date(this.xml.getAttribute('since') || '');
    },
    set since(value) {
        this.xml.setAttribute('since', value.toISOString());
    }
};


stanza.extend(Presence, Idle);


module.exports = Idle;
