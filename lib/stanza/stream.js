"use strict";

var stanza = require('jxt');
var util = require('./util');


module.exports = stanza.define({
    name: 'stream',
    namespace: 'http://etherx.jabber.org/streams',
    element: 'stream',
    fields: {
        lang: stanza.langAttribute(),
        id: stanza.attribute('id'),
        version: stanza.attribute('version', '1.0'),
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from')
    }
});
