var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var Iq = require('./iq');


var NS = 'urn:xmpp:jingle:1';


exports.Jingle = stanza.define({
    name: 'jingle',
    namespace: NS,
    element: 'jingle',
    fields: {
        action: stanza.attribute('action'),
        initiator: stanza.attribute('initiator'),
        responder: stanza.attribute('responder'),
        sid: stanza.attribute('sid')
    }
});


exports.Content = stanza.define({
    name: 'jingleContent',
    namespace: NS,
    element: 'content',
    fields: {
        creator: stanza.attribute('creator'),
        disposition: stanza.attribute('disposition', 'session'),
        name: stanza.attribute('name'),
        senders: stanza.attribute('senders', 'both')
    }
});


stanza.extend(Iq, exports.Jingle);
stanza.extend(exports.Jingle, exports.Content, 'contents');
