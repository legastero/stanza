'use strict';

var stanza = require('jxt');
var util = require('./util');
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


stanza.add(ErrorStanza, 'pubsubCondition', util.enumSub(ERRNS, CONDITIONS));
