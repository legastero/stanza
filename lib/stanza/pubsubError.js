'use strict';

var stanza = require('jxt');
var ErrorStanza = require('./error');


var ERRNS = 'http://jabber.org/protocol/pubsub#errors';
var CONDITIONS = [
    'closed-node',
    'configuration-required',
    'invalid-jid',
    'invalid-options',
    'invalid-payload',
    'invalid-subid',
    'item-forbidden',
    'item-required',
    'jid-required',
    'max-items-exceeded',
    'max-nodes-exceeded',
    'nodeid-required',
    'not-in-roster-group',
    'not-subscribed',
    'payload-too-big',
    'payload-required',
    'pending-subscription',
    'presence-subscription-required',
    'subid-required',
    'too-many-subscriptions',
    'unsupported',
    'unsupported-access-model'
];


stanza.add(ErrorStanza, 'pubsubCondition', {
    get: function () {
        var self = this;
        var result = [];
        CONDITIONS.forEach(function (condition) {
            var exists = stanza.find(self.xml, ERRNS, condition);
            if (exists.length) {
                result.push(exists[0].tagName);
            }
        });
        return result[0] || '';
    },
    set: function (value) {
        var self = this;
        CONDITIONS.forEach(function (condition) {
            var exists = stanza.find(self.xml, ERRNS, condition);
            if (exists.length) {
                self.xml.removeChild(exists[0]);
            }
        });

        if (value) {
            var condition = stanza.createElement(ERRNS, value);
            this.xml.appendChild(condition);
        }
    }
});
