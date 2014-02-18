"use strict";

var stanza = require('jxt');

var DataForm = require('./dataforms').DataForm;
var Iq = require('./iq');


var Command = module.exports = stanza.define({
    name: 'command',
    namespace: 'http://jabber.org/protocol/commands',
    element: 'command',
    fields: {
        action: stanza.attribute('action'),
        node: stanza.attribute('node'),
        sessionid: stanza.attribute('sessionid')
    }
});

stanza.extend(Iq, Command);
stanza.extend(Command, DataForm);
