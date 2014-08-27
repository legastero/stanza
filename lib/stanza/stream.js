'use strict';

var stanza = require('jxt');
var jxtutil = require('jxt-xmpp-types');


module.exports = stanza.define({
    name: 'stream',
    namespace: 'http://etherx.jabber.org/streams',
    element: 'stream',
    fields: {
        lang: stanza.langAttribute(),
        id: stanza.attribute('id'),
        version: stanza.attribute('version', '1.0'),
        to: jxtutil.jidAttribute('to', true),
        from: jxtutil.jidAttribute('from', true)
    }
});
