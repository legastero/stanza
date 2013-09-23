var stanza = require('jxt');
var Message = require('./message');


stanza.add(Message, 'requestReceipt', stanza.boolSub('urn:xmpp:receipts', 'request'));

var Received = module.exports = stanza.define({
    name: 'receipt',
    namespace: 'urn:xmpp:receipts',
    element: 'receipt',
    fields: {
        id: stanza.attribute('id')
    }
});

stanza.extend(Message, Received);
