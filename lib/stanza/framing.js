"use strict";

var stanza = require('jxt');
var util = require('./util');

var NS = 'urn:ietf:params:xml:ns:xmpp-framing';


exports.Open = stanza.define({
    name: 'openStream',
    namespace: NS,
    element: 'open',
    topLevel: true,
    fields: {
        lang: stanza.langAttribute(),
        id: stanza.attribute('id'),
        version: stanza.attribute('version', '1.0'),
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from')
    }
});

exports.Close = stanza.define({
    name: 'closeStream',
    namespace: NS,
    element: 'close',
    topLevel: true,
    fields: {
        seeOtherURI: stanza.attribute('see-other-uri')
    }
});
