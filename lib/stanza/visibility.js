var stanza = require('jxt');
var Iq = require('./iq');


stanza.add(Iq, 'visible', stanza.boolSub('urn:xmpp:invisible:0', 'visible'));
stanza.add(Iq, 'invisible', stanza.boolSub('urn:xmpp:invisible:0', 'invisible'));
