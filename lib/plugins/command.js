"use strict";

var stanzas = require('../stanza/command');

module.exports = function (client) {
    client.disco.addFeature('http://jabber.org/protocol/commands');
};
