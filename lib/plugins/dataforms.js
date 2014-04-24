"use strict";

require('../stanza/dataforms');

module.exports = function (client) {
    client.disco.addFeature('jabber:x:data');
    client.disco.addFeature('urn:xmpp:media-element');

    client.on('message', function (msg) {
        if (msg.form) {
            client.emit('dataform', msg);
        }
    });
};
