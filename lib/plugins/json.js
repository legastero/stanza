'use strict';


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/json'));
    client.disco.addFeature('urn:xmpp:json:0');
};
