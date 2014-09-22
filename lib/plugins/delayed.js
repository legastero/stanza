'use strict';


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/delayed'));
    client.disco.addFeature('urn:xmpp:delay');
};
