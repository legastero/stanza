var stanza = require('./stanza'),
    Message = require('./message').Message,
    Iq = require('./iq').Iq,
    Forwarded = require('./forwarded').Forwarded;


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
    get queryid () {
        return this.xml.getAttribute('queryid') || '';
    },
    set queryid (value) {
        this.xml.setAttribute('queryid', value);
    },
    get with () {
        return stanza.getSubText(this.xml, this.NS, 'with');
    },
    set with (value) {
        stanza.setSubText(this.xml, this.NS, 'with', value);
    },
    get start () {
        return new Date(stanza.getSubText(this.xml, this.NS, 'start') || '');
    },
    set start (value) {
        stanza.setSubText(this.xml, this.NS, 'start', value.toISOString());
    },
    get end () {
        return new Date(stanza.getSubText(this.xml, this.NS, 'end') || '');
    },
    set end (value) {
        stanza.setSubText(this.xml, this.NS, 'end', value.toISOString());
    }
};


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
    get queryid () {
        return this.xml.getAttribute('queryid') || '';
    },
    set queryid (value) {
        this.xml.setAttribute('queryid', value);
    },
    get id () {
        return this.xml.getAttribute('id') || '';
    },
    set id (value) {
        this.xml.setAttribute('id', value);
    }
};


stanza.extend(Iq, MAMQuery);
stanza.extend(Message, Result);
stanza.extend(Result, Forwarded);


exports.MAMQuery = MAMQuery;
exports.Result = Result;
