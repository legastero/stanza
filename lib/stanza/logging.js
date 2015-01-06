'use strict';

var NS = 'urn:xmpp:eventlog';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Log = stanza.define({
        name: 'log',
        namespace: NS,
        element: 'log',
        fields: {
            id: types.attribute('id'),
            timestamp: types.dateAttribute('timestamp'),
            type: types.attribute('type'),
            level: types.attribute('level'),
            object: types.attribute('object'),
            subject: types.attribute('subject'),
            facility: types.attribute('facility'),
            module: types.attribute('module'),
            message: types.textSub(NS, 'message'),
            stackTrace: types.textSub(NS, 'stackTrace')
        }
    });
    
    var Tag = stanza.define({
        name: '_logtag',
        namespace: NS,
        element: 'tag',
        fields: {
            name: types.attribute('name'),
            value: types.attribute('value'),
            type: types.attribute('type')
        }
    });
    
    
    stanza.extend(Log, Tag, 'tags');

    stanza.withMessage(function (Message) {
        stanza.extend(Message, Log);
    });

    stanza.withPubsubItem(function (Item) {
        stanza.extend(Item, Log);
    });
};
