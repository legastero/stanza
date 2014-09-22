'use strict';

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


module.exports = function (stanza) {
    stanza.withStanzaError(function (ErrorStanza) {
        stanza.add(ErrorStanza, 'pubsubCondition', stanza.utils.enumSub(ERRNS, CONDITIONS));
    });
};
