'use strict';

require('../stanza/oob');


module.exports = function (client) {
    client.disco.addFeature('jabber:x:oob');
};
