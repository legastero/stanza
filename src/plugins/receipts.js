import { Namespaces } from '../protocol';

export default function(client, stanzas, config) {
    const sendReceipts = config.sendReceipts !== false;

    client.disco.addFeature(Namespaces.RECEIPTS);

    client.on('message', function(msg) {
        const ackTypes = {
            chat: true,
            headline: true,
            normal: true
        };
        if (sendReceipts && ackTypes[msg.type] && msg.requestReceipt && !msg.receipt) {
            client.sendMessage({
                id: msg.id,
                receipt: msg.id,
                to: msg.from,
                type: msg.type
            });
        }
        if (msg.receipt) {
            client.emit('receipt', msg);
            client.emit('receipt:' + msg.receipt);
        }
    });
}
