var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var jxtutil = require('jxt-xmpp-types');

var DelayedDelivery = module.exports = stanza.define({
    name: 'delay',
    namespace: 'urn:xmpp:delay',
    element: 'delay',
    fields: {
        from: jxtutil.jidAttribute('from'),
        stamp: stanza.dateAttribute('stamp'),
        reason: stanza.text()
    }
});

stanza.extend(Message, DelayedDelivery);
stanza.extend(Presence, DelayedDelivery);
