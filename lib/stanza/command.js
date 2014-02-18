"use strict";

var stanza = require('jxt');

var DataForm = require('./dataforms').DataForm;
var ErrorStanza = require('./error');
var Iq = require('./iq');

var NS = 'http://jabber.org/protocol/commands';
var ACTIONS = ['next', 'prev', 'complete', 'cancel'];
var CONDITIONS = [
    'bad-action', 'bad-locale', 'bad-payload', 'bad-sessionid',
    'malformed-action', 'session-expired'
];


var Command = module.exports = stanza.define({
    name: 'command',
    namespace: NS,
    element: 'command',
    fields: {
        action: stanza.attribute('action'),
        node: stanza.attribute('node'),
        sessionid: stanza.attribute('sessionid'),
        status: stanza.attribute('status'),
        noteType: stanza.subAttribute(NS, 'note', 'type'),
        note: stanza.subText(NS, 'note'),
        execute: stanza.subAttribute(NS, 'actions', 'execute'),
        actions: {
            get: function () {
                var result = [];
                var actionSet = stanza.find(this.xml, NS, 'actions');
                if (!actionSet.length) return [];
                ACTIONS.forEach(function (action) {
                    var existing = stanza.find(actionSet[0], NS, action);
                    if (existing.length) {
                        result.push(action);
                    }
                });
                return result;
            },
            set: function (values) {
                var actionSet = stanza.findOrCreate(this.xml, NS, 'actions');
                for (var i = 0, len = actionSet.childNodes.length; i < len; i++) {
                    actionSet.removeChild(actionSet.childNodes[i]);
                }
                values.forEach(function (value) {
                    actionSet.appendChild(stanza.createElement(NS, value.toLowerCase(), NS));
                });
            }
        }
    }
});


stanza.add(ErrorStanza, 'adhocCommandCondition', {
    get: function () {
        var self = this;
        var result = [];
        CONDITIONS.forEach(function (condition) {
            var exists = stanza.find(self.xml, NS, condition);
            if (exists.length) {
                result.push(exists[0].tagName);
            }
        });
        return result[0] || '';
    },
    set: function (value) {
        var self = this;
        CONDITIONS.forEach(function (condition) {
            var exists = stanza.find(self.xml, NS, condition);
            if (exists.length) {
                self.xml.removeChild(exists[0]);
            }
        });

        if (value) {
            var condition = stanza.createElement(NS, value);
            this.xml.appendChild(condition);
        }
    }
});


stanza.extend(Iq, Command);
stanza.extend(Command, DataForm);
