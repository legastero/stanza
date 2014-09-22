'use strict';


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/psa'));
    client.disco.addFeature('urn:xmpp:psa');
};
