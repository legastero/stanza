import { Agent } from '../';
import * as JID from '../JID';
import {
    NS_ATTENTION_0,
    NS_CHAT_MARKERS_0,
    NS_CHAT_STATES,
    NS_CORRECTION_0,
    NS_RECEIPTS,
    NS_RTT_0
} from '../Namespaces';
import {
    CarbonMessage,
    DataForm,
    Message,
    MessageReceipt,
    ReceivedMessage,
    RTT
} from '../protocol';

declare module '../' {
    export interface Agent {
        getAttention(jid: string, opts?: Partial<Message>): void;
        enableCarbons(): Promise<void>;
        disableCarbons(): Promise<void>;
        markReceived(msg: Message): void;
        markDisplayed(msg: Message): void;
        markAcknowledged(msg: Message): void;
    }

    export interface AgentConfig {
        /**
         * Send Chat Markers
         *
         * When enabled, message display markers will automatically be sent when requested.
         *
         * @default true
         */
        chatMarkers?: boolean;
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
        attention: ReceivedMessage;
        'carbon:received': ReceivedCarbon;
        'carbon:sent': SentCarbon;
        'chat:state': ChatStateMessage;
        dataform: FormsMessage;
        'marker:acknowledged': ReceivedMessage;
        'marker:displayed': ReceivedMessage;
        'marker:received': ReceivedMessage;
        receipt: ReceiptMessage;
        replace: CorrectionMessage;
        rtt: RTTMessage;
    }
}

export type ReceivedCarbon = ReceivedMessage & {
    carbon: CarbonMessage & { type: 'received' };
};
export type SentCarbon = ReceivedMessage & {
    carbon: CarbonMessage & { type: 'sent' };
};
export type ChatStateMessage = ReceivedMessage & {
    chatState: ReceivedMessage['chatState'];
};
export type ReceiptMessage = ReceivedMessage & {
    receipt: MessageReceipt;
};
export type CorrectionMessage = ReceivedMessage & {
    replace: ReceivedMessage['replace'];
};
export type RTTMessage = Message & { rtt: RTT };
export type FormsMessage = ReceivedMessage & {
    forms: DataForm[];
};

const ACK_TYPES = new Set(['chat', 'headline', 'normal']);
const ALLOWED_CHAT_STATE_TYPES = new Set(['chat', 'groupchat', 'normal']);

const isReceivedCarbon = (msg: Message): msg is ReceivedCarbon =>
    !!msg.carbon && msg.carbon.type === 'received';
const isSentCarbon = (msg: Message): msg is SentCarbon =>
    !!msg.carbon && msg.carbon.type === 'sent';
const isChatState = (msg: Message): msg is ChatStateMessage => !!msg.chatState;
const isReceiptMessage = (msg: ReceivedMessage): msg is ReceiptMessage => !!msg.receipt;
const hasRTT = (msg: Message): msg is RTTMessage => !!msg.rtt;
const isCorrection = (msg: ReceivedMessage): msg is CorrectionMessage => !!msg.replace;
const isMarkable = (msg: Message, client: Agent) =>
    msg.marker && msg.marker.type === 'markable';
const isFormsMessage = (msg: ReceivedMessage): msg is FormsMessage =>
    !!msg.forms && msg.forms.length > 0;

async function toggleCarbons(client: Agent, action: 'enable' | 'disable') {
    await client.sendIQ({
        carbons: {
            action
        },
        type: 'set'
    });
}

function sendMarker(
    client: Agent,
    msg: Message,
    marker: 'received' | 'displayed' | 'acknowledged'
) {
    if (isMarkable(msg, client)) {
        const to = msg.type === 'groupchat' ? JID.toBare(msg.from) : msg.from;
        client.sendMessage({
            marker: {
                id: msg.id,
                type: marker
            },
            to,
            type: msg.type
        });
    }
}

export default function (client: Agent) {
    client.disco.addFeature(NS_ATTENTION_0);
    client.disco.addFeature(NS_CHAT_MARKERS_0);
    client.disco.addFeature(NS_CHAT_STATES);
    client.disco.addFeature(NS_CORRECTION_0);
    client.disco.addFeature(NS_RECEIPTS);
    client.disco.addFeature(NS_RTT_0);

    client.enableCarbons = () => toggleCarbons(client, 'enable');
    client.disableCarbons = () => toggleCarbons(client, 'disable');
    client.markReceived = (msg: Message) => sendMarker(client, msg, 'received');
    client.markDisplayed = (msg: Message) => sendMarker(client, msg, 'displayed');
    client.markAcknowledged = (msg: Message) => sendMarker(client, msg, 'acknowledged');

    client.getAttention = (jid: string, opts: Partial<Message> = {}) => {
        return client.sendMessage({
            ...opts,
            requestingAttention: true,
            to: jid,
            type: 'headline'
        });
    };

    client.on('message', msg => {
        if (msg.carbon && JID.equalBare(msg.from, client.jid)) {
            const forwardedMessage = msg.carbon.forward.message!;
            if (!forwardedMessage.delay) {
                forwardedMessage.delay = msg.carbon.forward.delay || {
                    timestamp: new Date(Date.now())
                };
            }
            if (isReceivedCarbon(msg)) {
                client.emit('carbon:received', msg);
                client.emit('message', forwardedMessage as ReceivedMessage);
            }
            if (isSentCarbon(msg)) {
                client.emit('carbon:sent', msg);
                client.emit('message:sent', forwardedMessage, true);
            }
        }
        if (isFormsMessage(msg)) {
            client.emit('dataform', msg);
        }
        if (msg.requestingAttention) {
            client.emit('attention', msg);
        }
        if (hasRTT(msg)) {
            client.emit('rtt', msg);
        }
        if (isCorrection(msg)) {
            client.emit('replace', msg);
        }
        if (isChatState(msg) && ALLOWED_CHAT_STATE_TYPES.has(msg.type || 'normal')) {
            client.emit('chat:state', msg);
        }
        if (isMarkable(msg, client) && client.config.chatMarkers !== false) {
            client.markReceived(msg);
        }
        if (msg.marker && msg.marker.type !== 'markable') {
            client.emit(`marker:${msg.marker.type}` as any, msg);
        }
        if (isReceiptMessage(msg)) {
            const sendReceipts = client.config.sendReceipts !== false;
            if (
                sendReceipts &&
                ACK_TYPES.has(msg.type || 'normal') &&
                msg.receipt.type === 'request'
            ) {
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
        }
    });
}
