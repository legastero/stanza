'use strict';

var stanza = require('jxt');
var Message = require('./message');

var NS = 'urn:xmpp:eventlog';


exports.Log = stanza.define({
    name: 'log',
    namespace: NS,
    element: 'log',
    fields: {
        id: stanza.attribute('id'),
        timestamp: stanza.dateAttribute('timestamp'),
        type: stanza.attribute('type'),
        level: stanza.attribute('level'),
        object: stanza.attribute('object'),
        subject: stanza.attribute('subject'),
        facility: stanza.attribute('facility'),
        module: stanza.attribute('module'),
        message: stanza.subText(NS, 'message'),
        stackTrace: stanza.subText(NS, 'stackTrace')
    }
});

exports.Tag = stanza.define({
    name: '_logtag',
    namespace: NS,
    element: 'tag',
    fields: {
        name: stanza.attribute('name'),
        value: stanza.attribute('value'),
        type: stanza.attribute('type')
    }
});


stanza.extend(exports.Log, exports.Tag, 'tags');
stanza.extend(Message, exports.Log);
