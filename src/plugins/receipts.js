import { Namespaces } from '../protocol';

export default function(client, stanzas, config) {
    const sendReceipts = config.sendReceipts !== false;

    client.disco.addFeature(Namespaces.RECEIPTS);

    client.on('message', function(msg) {
        const ackTypes = {
            normal: true,
            chat: true,
            headline: true
        };
        if (sendReceipts && ackTypes[msg.type] && msg.requestReceipt && !msg.receipt) {
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
}
