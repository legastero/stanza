var stanzas = require('../stanza/forwarded');


module.exports = function (client) {
    client.disco.addFeature('', 'urn:xmpp:forward:0');
};
