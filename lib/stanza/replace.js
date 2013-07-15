var stanza = require('jxt');
var Message = require('./message');


function Replace(data, xml) {
    return stanza.init(this, xml, data);
}
Replace.prototype = {
    constructor: {
        value: Replace 
    },
    NS: 'urn:xmpp:message-correct:0',
    EL: 'replace',
    _name: '_replace',
    toString: stanza.toString,
    toJSON: undefined,
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    }
};


stanza.extend(Message, Replace);

Message.prototype.__defineGetter__('replace', function () {
    if (this._extensions._replace) {
        return this._replace.id;
    }
    return '';
});
Message.prototype.__defineSetter__('replace', function (value) {    
    if (value) {
        this._replace.id = value;
    } else if (this._extensions._replace) {
        this.xml.removeChild(this._extensions._replace.xml);
        delete this._extensions._replace;
    }
});


module.exports = Replace;
