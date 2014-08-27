'use strict';

var stanza = require('jxt');
var jxtutil = require('jxt-xmpp-types');
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
        from: jxtutil.jidAttribute('from'),
        condition: stanza.enumSub(NS, CONDITIONS),
        description: stanza.subText(NS, 'description')
    }
});


stanza.extend(Presence, PSA);
