"use strict";

var stanza = require('jxt');
var util = require('./util');
var Message = require('./message');
var Iq = require('./iq');
var Forwarded = require('./forwarded');
var RSM = require('./rsm');
var JID = require('../jid');
var DataForm = require('./dataforms').DataForm;

var NS = 'urn:xmpp:mam:0';

exports.MAMQuery = stanza.define({
    name: 'mamQuery',
    namespace: NS,
    element: 'query',
    fields: {
        queryid: stanza.attribute('queryid')
    }
});

exports.Result = stanza.define({
    name: 'mam',
    eventName: 'mam:result',
    namespace: NS,
    element: 'result',
    fields: {
        queryid: stanza.attribute('queryid'),
        id: stanza.attribute('id')
    }
});

exports.Fin = stanza.define({
    name: 'mamFin',
    eventName: 'mam:fin',
    namespace: NS,
    element: 'fin',
    fields: {
        queryid: stanza.attribute('queryid')
    }
});

exports.Archived = stanza.define({
    name: 'mamArchived',
    namespace: NS,
    element: 'archived',
    fields: {
        by: util.jidAttribute('by'),
        id: stanza.attribute('id')
    }
});

exports.Prefs = stanza.define({
    name: 'mamPrefs',
    namespace: NS,
    element: 'prefs',
    fields: {
        defaultCondition: stanza.attribute('default'),
        always: {
            get: function () {
                var results = [];
                var container = stanza.find(this.xml, this._NS, 'always');
                if (container.length === 0) {
                    return results;
                }
                container = container[0];
                var jids = stanza.getMultiSubText(container, this._NS, 'jid');
                jids.forEach(function (jid) {
                    results.push(new JID(jid.textContent));
                });
                return results;
            },
            set: function (value) {
                if (value.length > 0) {
                    var container = stanza.find(this.xml, this._NS, 'always');
                    stanza.setMultiSubText(container, this._NS, 'jid', value);
                }
            }
        },
        never: {
            get: function () {
                var results = [];
                var container = stanza.find(this.xml, this._NS, 'always');
                if (container.length === 0) {
                    return results;
                }
                container = container[0];
                var jids = stanza.getMultiSubText(container, this._NS, 'jid');
                jids.forEach(function (jid) {
                    results.push(new JID(jid.textContent));
                });
                return results;
            },
            set: function (value) {
                if (value.length > 0) {
                    var container = stanza.find(this.xml, this._NS, 'never');
                    stanza.setMultiSubText(container, this._NS, 'jid', value);
                }
            }
        }
    }
});

stanza.extend(Message, exports.Archived, 'archived');
stanza.extend(Iq, exports.MAMQuery);
stanza.extend(Iq, exports.Prefs);
stanza.extend(Message, exports.Result);
stanza.extend(exports.Result, Forwarded);
stanza.extend(exports.MAMQuery, RSM);
stanza.extend(exports.MAMQuery, DataForm);
stanza.extend(Message, exports.Fin);
