var stanza = require('./stanza');
var Message = require('./message');
var Iq = require('./iq');
var Forwarded = require('./forwarded');
var RSM = require('./rsm');


function MAMQuery(data, xml) {
    return stanza.init(this, xml, data);
}
MAMQuery.prototype = {
    constructor: {
        value: MAMQuery
    },
    NS: 'urn:xmpp:mam:tmp',
    EL: 'query',
    _name: 'mamQuery',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get queryid() {
        return this.xml.getAttribute('queryid') || '';
    },
    set queryid(value) {
        this.xml.setAttribute('queryid', value);
    },
    get start() {
        return new Date(stanza.getSubText(this.xml, this.NS, 'start') || '');
    },
    set start(value) {
        stanza.setSubText(this.xml, this.NS, 'start', value.toISOString());
    },
    get end() {
        return new Date(stanza.getSubText(this.xml, this.NS, 'end') || '');
    },
    set end(value) {
        stanza.setSubText(this.xml, this.NS, 'end', value.toISOString());
    }
};
MAMQuery.prototype.__defineGetter__('with', function () {
    return stanza.getSubText(this.xml, this.NS, 'with');
});
MAMQuery.prototype.__defineSetter__('with', function (value) {
    stanza.setSubText(this.xml, this.NS, 'with', value);
});


function Result(data, xml) {
    return stanza.init(this, xml, data);
}
Result.prototype = {
    constructor: {
        value: Result
    },
    NS: 'urn:xmpp:mam:tmp',
    EL: 'result',
    _name: 'mam',
    _eventname: 'mam:result',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get queryid() {
        return this.xml.getAttribute('queryid') || '';
    },
    set queryid(value) {
        this.xml.setAttribute('queryid', value);
    },
    get id() {
        return this.xml.getAttribute('id') || '';
    },
    set id(value) {
        this.xml.setAttribute('id', value);
    }
};


function Archived(data, xml) {
    return stanza.init(this, xml, data);
}
Archived.prototype = {
    constructor: {
        value: Result
    },
    NS: 'urn:xmpp:mam:tmp',
    EL: 'archived',
    _name: 'archived',
    _eventname: 'mam:archived',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get by() {
        return this.xml.getAttribute('queryid') || '';
    },
    set by(value) {
        this.xml.setAttribute('queryid', value);
    },
    get id() {
        return this.xml.getAttribute('id') || '';
    },
    set id(value) {
        this.xml.setAttribute('id', value);
    }
};


stanza.extend(Iq, MAMQuery);
stanza.extend(Message, Result);
stanza.extend(Message, Archived);
stanza.extend(Result, Forwarded);
stanza.extend(MAMQuery, RSM);

exports.MAMQuery = MAMQuery;
exports.Result = Result;
