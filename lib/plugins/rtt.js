'use strict';


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/rtt'));

    client.disco.addFeature('urn:xmpp:rtt:0');

    client.on('message', function (msg) {
        if (msg.rtt) {
            client.emit('rtt', msg);
            client.emit('rtt:' + msg.rtt.event, msg);
        }
    });
};
