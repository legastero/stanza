var stanzas = require('../stanza/idle');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:idle:0');
};
