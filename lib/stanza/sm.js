var stanza = require('jxt');
var StreamFeatures = require('./streamFeatures');


function SMFeature(data, xml) {
    return stanza.init(this, xml, data);
}
SMFeature.prototype = {
    constructor: {
        value: SMFeature
    },
    _name: 'streamManagement',
    NS: 'urn:xmpp:sm:3',
    EL: 'sm',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Enable(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Enable
    },
    _name: 'smEnable',
    _eventname: 'stream:management:enable',
    NS: 'urn:xmpp:sm:3',
    EL: 'enable',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get resume() {
        var val = this.xml.getAttribute('resume');
        return val == 'true' || val == '1';
    },
    set resume(val) {
        if (val) {
            this.xml.setAttribute('resume', 'true');
        }
    }
};


function Enabled(data, xml) {
    return stanza.init(this, xml, data);
}
Enabled.prototype = {
    constructor: {
        value: Enabled
    },
    _name: 'smEnabled',
    _eventname: 'stream:management:enabled',
    NS: 'urn:xmpp:sm:3',
    EL: 'enabled',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get id() {
        return this.xml.getAttribute('id') || '';
    },
    set id(value) {
        this.xml.setAttribute('id', value);
    },
    get resume() {
        var val = this.xml.getAttribute('resume');
        return val == 'true' || val == '1';
    },
    set resume(val) {
        if (val) {
            this.xml.setAttribute('resume', 'true');
        }
    }
};


function Resume(data, xml) {
    return stanza.init(this, xml, data);
}
Resume.prototype = {
    constructor: {
        value: Resume
    },
    _name: 'smResume',
    _eventname: 'stream:management:resume',
    NS: 'urn:xmpp:sm:3',
    EL: 'resume',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get h() {
        return parseInt(this.xml.getAttribute('h') || '0', 10);
    },
    set h(value) {
        this.xml.setAttribute('h', '' + value);
    },
    get previd() {
        return this.xml.getAttribute('previd') || '';
    },
    set previd(value) {
        this.xml.setAttribute('previd', value);
    }
};


function Resumed(data, xml) {
    return stanza.init(this, xml, data);
}
Resumed.prototype = {
    constructor: {
        value: Resumed
    },
    _name: 'smResumed',
    _eventname: 'stream:management:resumed',
    NS: 'urn:xmpp:sm:3',
    EL: 'resumed',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get h() {
        return parseInt(this.xml.getAttribute('h') || '0', 10);
    },
    set h(value) {
        this.xml.setAttribute('h', '' + value);
    },
    get previd() {
        return this.xml.getAttribute('previd') || '';
    },
    set previd(value) {
        this.xml.setAttribute('previd', value);
    }
};


function Failed(data, xml) {
    return stanza.init(this, xml, data);
}
Failed.prototype = {
    constructor: {
        value: Failed
    },
    _name: 'smFailed',
    _eventname: 'stream:management:failed',
    NS: 'urn:xmpp:sm:3',
    EL: 'failed',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Ack(data, xml) {
    return stanza.init(this, xml, data);
}
Ack.prototype = {
    constructor: {
        value: Ack
    },
    _name: 'smAck',
    _eventname: 'stream:management:ack',
    NS: 'urn:xmpp:sm:3',
    EL: 'a',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get h() {
        return parseInt(this.xml.getAttribute('h') || '0', 10);
    },
    set h(value) {
        this.xml.setAttribute('h', '' + value);
    }
};


function Request(data, xml) {
    return stanza.init(this, xml, data);
}
Request.prototype = {
    constructor: {
        value: Request
    },
    _name: 'smRequest',
    _eventname: 'stream:management:request',
    NS: 'urn:xmpp:sm:3',
    EL: 'r',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(StreamFeatures, SMFeature);
stanza.topLevel(Ack);
stanza.topLevel(Request);
stanza.topLevel(Enable);
stanza.topLevel(Enabled);
stanza.topLevel(Resume);
stanza.topLevel(Resumed);
stanza.topLevel(Failed);


exports.SMFeature = SMFeature;
exports.Enable = Enable;
exports.Enabled = Enabled;
exports.Resume = Resume;
exports.Resumed = Resumed;
exports.Failed = Failed;
exports.Ack = Ack;
exports.Request = Request;
