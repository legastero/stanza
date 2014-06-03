'use strict';

require('../stanza/dataforms');


module.exports = function (client) {
    client.disco.addFeature('jabber:x:data');
    client.disco.addFeature('urn:xmpp:media-element');
    client.disco.addFeature('http://jabber.org/protocol/xdata-validate');

    client.on('message', function (msg) {
        if (msg.form) {
            client.emit('dataform', msg);
        }
    });
};
