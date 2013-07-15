var stanza = require('jxt');
var Presence = require('./presence');


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
        return new Date(stanza.getAttribute(this.xml, 'since'));
    },
    set since(value) {
        stanza.setAttribute(this.xml, 'since', value.toISOString());
    }
};


stanza.extend(Presence, Idle);


module.exports = Idle;
