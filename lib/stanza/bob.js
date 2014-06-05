var stanza = require('jxt');

var Iq = require('./iq');
var Message = require('./message');
var Presence = require('./presence');

var NS = 'urn:xmpp:bob';


var BOB = module.exports = stanza.define({
    name: 'bob',
    namespace: NS,
    element: 'data',
    fields: {
        cid: stanza.attribute('cid'),
        maxAge: stanza.numberAttribute('max-age'),
        type: stanza.attribute('type'),
        data: stanza.text()
    }
});


stanza.extend(Iq, BOB);
stanza.extend(Message, BOB);
stanza.extend(Presence, BOB);
