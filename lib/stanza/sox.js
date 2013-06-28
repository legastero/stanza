var _ = require('lodash');
var stanza = require('./stanza');
var Message = require('./message');


function SOX(data, xml) {
    return stanza.init(this, xml, data);
}
SOX.prototype = {
    constructor: {
        value: SOX
    },
    _name: 'sox',
    NS: 'http://stanza.io/protocol/sox',
    EL: 'sox',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get type() {
        return stanza.getAttribute(this.xml, 'type');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'type', value);
    },
    get label() {
        return stanza.getAttribute(this.xml, 'label');
    },
    set label(value) {
        stanza.setAttribute(this.xml, 'label', value);
    },
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get sid() {
        return stanza.getAttribute(this.xml, 'sid');
    },
    set sid(value) {
        stanza.setAttribute(this.xml, 'sid', value);
    },
    get sdp() {
        return this.xml.textContent;
    },
    set sdp(value) {
        this.xml.textContent = value;
    }
};


stanza.extend(Message, SOX);
module.exports = SOX;
