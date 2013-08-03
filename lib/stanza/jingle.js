var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Iq = require('./iq');


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
    get action() {
        return stanza.getAttribute(this.xml, 'action');
    },
    set action(value) {
        stanza.setAttribute(this.xml, 'action', value);
    },
    get initiator() {
        return stanza.getAttribute(this.xml, 'initiator');
    },
    set initiator(value) {
        stanza.setAttribute(this.xml, 'initiator', value);
    },
    get responder() {
        return stanza.getAttribute(this.xml, 'responder');
    },
    set responder(value) {
        stanza.setAttribute(this.xml, 'responder', value);
    },
    get sid() {
        return stanza.getAttribute(this.xml, 'sid');
    },
    set sid(value) {
        stanza.setAttribute(this.xml, 'sid', value);
    },
    get contents() {
        var contents = stanza.find(this.xml, 'urn:xmpp:jingle:1', 'content');
        var results = [];

        _.forEach(contents, function (xml) {
            results.push(new Content({}, xml).toJSON());
        });
        return results;
    },
    set contents(value) {
        var self = this;
        _.forEach(value, function (data) {
            var content = new Content(data);
            self.xml.appendChild(content.xml);
        });
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
    get creator() {
        return stanza.getAttribute(this.xml, 'creator');
    },
    set creator(value) {
        stanza.setAttribute(this.xml, 'creator', value);
    },
    get disposition() {
        return stanza.getAttribute(this.xml, 'disposition', 'session');
    },
    set disposition(value) {
        stanza.setAttribute(this.xml, 'disposition', value);
    },
    get name() {
        return stanza.getAttribute(this.xml, 'name');
    },
    set name(value) {
        stanza.setAttribute(this.xml, 'name', value);
    },
    get senders() {
        return stanza.getAttribute(this.xml, 'senders', 'both');
    },
    set senders(value) {
        stanza.setAttribute(this.xml, 'senders', value);
    }
};


stanza.extend(Iq, Jingle);

exports.Jingle = Jingle;
exports.Content = Content;
