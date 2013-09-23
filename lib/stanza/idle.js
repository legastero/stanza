var stanza = require('jxt');
var util = require('./util');
var Presence = require('./presence');

var Idle = module.exports = stanza.define({
    name: 'idle',
    namespace: 'urn:xmpp:idle:0',
    element: 'idle',
    fields: {
        since: util.dateAttribute('since')
    }
});

stanza.extend(Presence, Idle);
