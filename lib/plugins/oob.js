'use strict';


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/oob'));
    client.disco.addFeature('jabber:x:oob');
};
