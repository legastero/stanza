'use strict';

var stanza = require('jxt');
var util = require('./util');
var Presence = require('./presence');

var NS = 'urn:xmpp:psa';
var CONDITIONS = [
    'server-unavailable', 'connection-paused'
];


var PSA = module.exports = stanza.define({
    name: 'state',
    namespace: NS,
    element: 'state-annotation',
    fields: {
        from: util.jidAttribute('from'),
        condition: util.enumSub(NS, CONDITIONS),
        description: stanza.subText(NS, 'description')
    }
});


stanza.extend(Presence, PSA);
