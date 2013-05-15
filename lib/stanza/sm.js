var stanza = require('./stanza');


function Enable(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Enable
    },
    _name: 'smEnable',
    NS: 'urn:xmpp:sm:3',
    EL: 'enable',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Enabled(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Enabled
    },
    _name: 'smEnabled',
    NS: 'urn:xmpp:sm:3',
    EL: 'enabled',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Resume(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Resumed
    },
    _name: 'smResume',
    NS: 'urn:xmpp:sm:3',
    EL: 'resume',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Resumed(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Resumed
    },
    _name: 'smResumed',
    NS: 'urn:xmpp:sm:3',
    EL: 'resumed',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Failed(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Failed
    },
    _name: 'smFailed',
    NS: 'urn:xmpp:sm:3',
    EL: 'failed',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Ack(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Ack
    },
    _name: 'smAck',
    NS: 'urn:xmpp:sm:3',
    EL: 'a',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get h () {
        return parseInt(this.xml.getAttribute('h') || '0', 10);
    },
    set h (value) {
        if (value) {
            this.xml.setAttribute('h', '' + value);
        } else {
            this.xml.removeAttribute('h');
        }
    }
};


function Request(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Request
    },
    _name: 'smRequest',
    NS: 'urn:xmpp:sm:3',
    EL: 'r',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};
