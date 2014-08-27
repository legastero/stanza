'use strict';

var stanza = require('jxt');
var jxtutil = require('jxt-xmpp-types');
var Iq = require('./iq');


var EntityTime = module.exports = stanza.define({
    name: 'time',
    namespace: 'urn:xmpp:time',
    element: 'time',
    fields: {
        utc: stanza.dateSub('urn:xmpp:time', 'utc'),
        tzo: jxtutil.tzoSub('urn:xmpp:time', 'tzo', 0)
    }
});


stanza.extend(Iq, EntityTime);
