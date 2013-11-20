"use strict";

var stanzas = require('../stanza/delayed');

module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:delay');
};
