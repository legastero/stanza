'use strict';

require('../stanza/psa');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:psa');
};
