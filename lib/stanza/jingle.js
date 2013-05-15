var _ = require('lodash'),
    stanza = require('./stanza'),
    Iq = require('./iq').Iq;


function Jingle(data, xml) {
    return stanza.init(this, xml, data);
}
Jingle.prototype = {
    constructor: {
        value: Jingle,
    },
    _name: 'jingle',
    NS: 'urn:xmpp:jingle:1',
    EL: 'jingle',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get action () {
        return stanza.getAttribute(this.xml, 'action');
    },
    set action (value) {
        stanza.setAttribute(this.xml, 'action', value);
    },
    get initiator () {
        return stanza.getAttribute(this.xml, 'initiator');
    },
    set initiator (value) {
        stanza.setAttribute(this.xml, 'initiator', value);
    },
    get responder () {
        return stanza.getAttribute(this.xml, 'responder');
    },
    set responder (value) {
        stanza.setAttribute(this.xml, 'responder', value);
    },
    get sid () {
        return stanza.getAttribute(this.xml, 'sid');
    },
    set sid(value) {
        stanza.setAttribute(this.xml, 'sid', value);
    },
    get contents () {
    },
    set contents (value) {
    }
};


function Content(data, xml) {
    return stanza.init(this, xml, data);
}
Content.prototype = {
    constructor: {
        value: Content
    },
    _name: 'jingleContent',
    NS: 'urn:xmpp:jingle:1',
    EL: 'content',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get creator () {
        return stanza.getAttribute(this.xml, 'creator');
    },
    set creator (value) {
        stanza.setAttribute(this.xml, 'creator', value);
    },
    get disposition () {
        return stanza.getAttribute(this.xml, 'disposition', 'session');
    },
    set disposition (value) {
        stanza.setAttribute(this.xml, 'disposition', value);
    },
    get name () {
        return stanza.getAttribute(this.xml, 'name');
    },
    set name (value) {
        stanza.setAttribute(this.xml, 'name', value);
    },
    get senders () {
        return stanza.getAttribute(this.xml, 'senders', 'both');
    },
    set senders (value) {
        stanza.setAttribute(this.xml, 'senders', value);
    }
};


stanza.extend(Iq, Jingle);

exports.Jingle = Jingle;
exports.Content = Content;
