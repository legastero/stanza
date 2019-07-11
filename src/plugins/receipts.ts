import { Agent } from '../';
import { NS_RECEIPTS } from '../Namespaces';
import { MessageReceipt, ReceivedMessage } from '../protocol';

type ReceiptMessage = ReceivedMessage & {
    receipt: MessageReceipt;
};

declare module '../' {
    export interface AgentConfig {
        /**
         * Send Message Delivery Receipts
         *
         * When enabled, message receipts will automatically be sent when requested.
         *
         * @default true
         */
        sendReceipts?: boolean;
    }

    export interface AgentEvents {
        receipt: ReceiptMessage;
    }
}

function isReceiptMessage(msg: ReceivedMessage): msg is ReceiptMessage {
    return !!msg.receipt;
}

const ACK_TYPES = new Set<string>(['chat', 'headline', 'normal']);

export default function(client: Agent) {
    client.disco.addFeature(NS_RECEIPTS);

    client.on('message', msg => {
        const sendReceipts = client.config.sendReceipts !== false;

        if (!isReceiptMessage(msg)) {
            return;
        }

        if (sendReceipts && ACK_TYPES.has(msg.type || 'normal') && msg.receipt.type === 'request') {
            client.sendMessage({
                id: msg.id,
                receipt: {
                    id: msg.id,
                    type: 'received'
                },
                to: msg.from,
                type: msg.type
            });
        }

        if (msg.receipt.type === 'received') {
            client.emit('receipt', msg);
        }
    });
}
