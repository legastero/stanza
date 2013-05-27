var stanzas = require('../stanza/delayed');


exports.init = function (client) {
    client.disco.addFeature('', 'urn:xmpp:delay');
};
