'use strict';


module.exports = function (stanza) {
    var Sent = stanza.define({
        name: 'carbonSent',
        eventName: 'carbon:sent',
        namespace: 'urn:xmpp:carbons:2',
        element: 'sent'
    });
    
    var Received = stanza.define({
        name: 'carbonReceived',
        eventName: 'carbon:received',
        namespace: 'urn:xmpp:carbons:2',
        element: 'received'
    });
    
    var Private = stanza.define({
        name: 'carbonPrivate',
        eventName: 'carbon:private',
        namespace: 'urn:xmpp:carbons:2',
        element: 'private'
    });
    
    var Enable = stanza.define({
        name: 'enableCarbons',
        namespace: 'urn:xmpp:carbons:2',
        element: 'enable'
    });
    
    var Disable = stanza.define({
        name: 'disableCarbons',
        namespace: 'urn:xmpp:carbons:2',
        element: 'disable'
    });
    
    
    stanza.withDefinition('forwarded', 'urn:xmpp:forward:0', function (Forwarded) {
        stanza.extend(Sent, Forwarded);
        stanza.extend(Received, Forwarded);
    });

    stanza.withMessage(function (Message) {
        stanza.extend(Message, Sent);
        stanza.extend(Message, Received);
        stanza.extend(Message, Private);
    });

    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Enable);
        stanza.extend(Iq, Disable);
    });
};
