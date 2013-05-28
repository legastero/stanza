var stanzas = require('../stanza/forwarded');


exports.init = function (client) {
    client.disco.addFeature('', 'urn:xmpp:forward:0');
};
