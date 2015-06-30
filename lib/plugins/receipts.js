'use strict';

module.exports = function (client) {

    client.disco.addFeature('urn:xmpp:receipts');

    client.on('message', function (msg) {
        var ackTypes = {
            normal: true,
            chat: true,
            headline: true
        };
        if (ackTypes[msg.type] && msg.requestReceipt && !msg.receipt) {
            client.sendMessage({
                to: msg.from,
                type: msg.type,
                receipt: msg.id,
                id: msg.id
            });
        }
        if (msg.receipt) {
            client.emit('receipt', msg);
            client.emit('receipt:' + msg.receipt);
        }
    });
};
