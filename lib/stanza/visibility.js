var stanza = require('jxt');
var Iq = require('./iq');


function Visible(data, xml) {
    return stanza.init(this, xml, data);
}
Visible.prototype = {
    constructor: {
        value: Visible 
    },
    NS: 'urn:xmpp:invisible:0',
    EL: 'visible',
    _name: '_visible',
    toString: stanza.toString,
    toJSON: undefined
};


function Invisible(data, xml) {
    return stanza.init(this, xml, data);
}
Invisible.prototype = {
    constructor: {
        value: Invisible 
    },
    NS: 'urn:xmpp:invisible:0',
    EL: 'invisible',
    _name: '_invisible',
    toString: stanza.toString,
    toJSON: undefined
};



Iq.prototype.__defineGetter__('visible', function () {
    return !!this._extensions._visible;
});
Iq.prototype.__defineSetter__('visible', function (value) {    
    if (value) {
        this._visible = true;
    } else if (this._extensions._visible) {
        this.xml.removeChild(this._extensions._visible.xml);
        delete this._extensions._visible;
    }
});


Iq.prototype.__defineGetter__('invisible', function () {
    return !!this._extensions._invisible;
});
Iq.prototype.__defineSetter__('invisible', function (value) {    
    if (value) {
        this._invisible = true;
    } else if (this._extensions._invisible) {
        this.xml.removeChild(this._extensions._invisible.xml);
        delete this._extensions._invisible;
    }
});


stanza.extend(Iq, Visible);
stanza.extend(Iq, Invisible);

exports.Visible = Visible;
exports.Invisible = Invisible;
