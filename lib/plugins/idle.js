var stanzas = require('../stanza/idle');


exports.init = function (client) {
    client.disco.addFeature('', 'urn:xmpp:idle:0');
};
