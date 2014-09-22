'use strict';


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/forwarded'));

    client.disco.addFeature('urn:xmpp:forward:0');
};
