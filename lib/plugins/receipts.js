var stanzas = require('../stanza/receipts');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:receipts');

    client.on('message', function (msg) {
        var ackTypes = {
            normal: true,
            chat: true,
            headline: true
        };
        if (ackTypes[msg.type] && msg.requestReceipt && !msg._extensions.receipt) {
            client.sendMessage({
                to: msg.from,
                receipt: {
                    id: msg.id
                },
                id: msg.id
            });
        }
        if (msg._extensions.receipt) {
            client.emit('receipt:' + msg.receipt.id);
        }
    });
};
