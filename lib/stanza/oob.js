'use strict';

var stanza = require('jxt');
var Message = require('./message');
var NS = 'jabber:x:oob';

var OOB = module.exports = stanza.define({
    name: 'oob',
    element: 'x',
    namespace: NS,
    fields: {
        url: stanza.subText(NS, 'url'),
        desc: stanza.subText(NS, 'desc')
    }
});

stanza.extend(Message, OOB, 'oobURIs');
