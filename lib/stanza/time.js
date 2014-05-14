'use strict';

var stanza = require('jxt');
var util = require('./util');
var Iq = require('./iq');


var EntityTime = module.exports = stanza.define({
    name: 'time',
    namespace: 'urn:xmpp:time',
    element: 'time',
    fields: {
        utc: stanza.dateSub('urn:xmpp:time', 'utc'),
        tzo: util.tzoSub('urn:xmpp:time', 'tzo')
    }
});


stanza.extend(Iq, EntityTime);
