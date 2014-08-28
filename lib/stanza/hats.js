'use strict';

var stanza = require('jxt');
var Presence = require('./presence');

var NS = 'urn:xmpp:hats:0';


var Hat = module.exports = stanza.define({
    name: '_hat',
    namespace: NS,
    element: 'hat',
    fields: {
        lang: stanza.langAttribute(),
        name: stanza.attribute('name'),
        displayName: stanza.attribute('displayName')
    }
});


stanza.add(Presence, 'hats', stanza.subMultiExtension(NS, 'hats', Hat));
