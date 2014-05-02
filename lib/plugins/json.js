'use strict';

require('../stanza/json');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:json:tmp');
};
