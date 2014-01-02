"use strict";

var stanzas = require('../stanza/oob');

module.exports = function (client) {
    client.disco.addFeature('jabber:x:oob');
};
