var stanza = require('jxt');
var Message = require('./message');
var Iq = require('./iq');
var Forwarded = require('./forwarded');
var RSM = require('./rsm');
var JID = require('../jid');


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
        return stanza.getAttribute(this.xml, 'queryid');
    },
    set queryid(value) {
        stanza.setAttribute(this.xml, 'queryid', value);
    },
    get start() {
        return new Date(stanza.getSubText(this.xml, this.NS, 'start') || Date.now());
    },
    set start(value) {
        stanza.setSubText(this.xml, this.NS, 'start', value.toISOString());
    },
    get end() {
        return new Date(stanza.getSubText(this.xml, this.NS, 'end') || Date.now());
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
        return stanza.getAttribute(this.xml, 'queryid');
    },
    set queryid(value) {
        stanza.setAttribute(this.xml, 'queryid', value);
    },
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    }
};


function Prefs(data, xml) {
    return stanza.init(this, xml, data);
}
Prefs.prototype = {
    constructor: {
        value: Prefs
    },
    NS: 'urn:xmpp:mam:tmp',
    EL: 'prefs',
    _name: 'mamPrefs',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get defaultCondition() {
        return stanza.getAttribute(this.xml, 'default');
    },
    set defaultCondition(value) {
        stanza.setAttribute(this.xml, 'default', value);
    },
    get always() {
        var results = [];
        var container = stanza.find(this.xml, this.NS, 'always');
        if (container.length === 0) {
            return results;
        }
        container = container[0];
        var jids = stanza.getMultiSubText(container, this.NS, 'jid');
        jids.forEach(function (jid) {
            results.push(new JID(jid.textContent));
        });
        return results;
    },
    set always(value) {
        if (value.length > 0) {
            var container = stanza.find(this.xml, this.NS, 'always');
            stanza.setMultiSubText(container, this.NS, 'jid', value);
        }
    },
    get never() {
        var results = [];
        var container = stanza.find(this.xml, this.NS, 'always');
        if (container.length === 0) {
            return results;
        }
        container = container[0];
        var jids = stanza.getMultiSubText(container, this.NS, 'jid');
        jids.forEach(function (jid) {
            results.push(new JID(jid.textContent));
        });
        return results;
  
    },
    set never(value) {
        if (value.length > 0) {
            var container = stanza.find(this.xml, this.NS, 'never');
            stanza.setMultiSubText(container, this.NS, 'jid', value);
        }
    }
};


Message.prototype.__defineGetter__('archived', function () {
    var archives = stanza.find(this.xml, this.NS, 'archived');
    var results = [];
    archives.forEach(function (archive) {
        results.push({
            by: new JID(stanza.getAttribute(archive, 'by')),
            id: stanza.getAttribute(archive, 'id')
        });
    });
    return results;
});


stanza.extend(Iq, MAMQuery);
stanza.extend(Iq, Prefs);
stanza.extend(Message, Result);
stanza.extend(Result, Forwarded);
stanza.extend(MAMQuery, RSM);

exports.MAMQuery = MAMQuery;
exports.Result = Result;
