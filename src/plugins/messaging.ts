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
        sendMarker(msg: Message, marker: ChatMarkerLabel, force?: boolean): void;
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
         * Chat Markers Use Stanza ID
         *
         * When enabled, chat markers for MUC messages will use the stanza ID stamped by the MUC,
         * if one is present.
         *
         * This option is intended to allow interop with some servers that stamp stanza IDs, but
         * also still rely on the plain message ID for tracking marker states.
         *
         * @default true
         */
        groupchatMarkersUseStanzaID?: boolean;

        /**
         * Send Message Delivery Receipts
         *
         * When enabled, message receipts will automatically be sent when requested.
         *
         * @default true
         */
        sendReceipts?: boolean;

        /**
         * Send Message Delivery Receipts in MUCs
         *
         * When enabled (in addition to enabling `sendReceipts`), message receipts will automatically
         * be sent when requested in a MUC room.
         *
         * @default true
         */
        sendMUCReceipts?: boolean;
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

type ChatMarkerLabel = 'markable' | 'received' | 'displayed' | 'acknowledged';

const ACK_TYPES = new Set(['chat', 'groupchat', 'headline', 'normal']);
const ALLOWED_CHAT_STATE_TYPES = new Set(['chat', 'groupchat', 'normal']);
const MARKER_RANK = new Map<ChatMarkerLabel, number>([
    ['markable', 0],
    ['received', 1],
    ['displayed', 2],
    ['acknowledged', 3]
]);

const isReceivedCarbon = (msg: Message): msg is ReceivedCarbon =>
    !!msg.carbon && msg.carbon.type === 'received';
const isSentCarbon = (msg: Message): msg is SentCarbon =>
    !!msg.carbon && msg.carbon.type === 'sent';
const isChatState = (msg: Message): msg is ChatStateMessage => !!msg.chatState;
const isReceiptRequest = (msg: ReceivedMessage): msg is ReceiptMessage =>
    !!msg.receipt && msg.receipt.type === 'request' && ACK_TYPES.has(msg.type ?? 'normal');
const hasRTT = (msg: Message): msg is RTTMessage => !!msg.rtt;
const isCorrection = (msg: ReceivedMessage): msg is CorrectionMessage => !!msg.replace;
const isMarkable = (msg: Message, marker: ChatMarkerLabel) =>
    msg.marker &&
    (MARKER_RANK.get(msg.marker.type)! < MARKER_RANK.get(marker)! ||
        msg.marker?.type === 'markable');
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

export default function (client: Agent) {
    client.disco.addFeature(NS_ATTENTION_0);
    client.disco.addFeature(NS_CHAT_MARKERS_0);
    client.disco.addFeature(NS_CHAT_STATES);
    client.disco.addFeature(NS_CORRECTION_0);
    client.disco.addFeature(NS_RECEIPTS);
    client.disco.addFeature(NS_RTT_0);

    client.enableCarbons = () => toggleCarbons(client, 'enable');
    client.disableCarbons = () => toggleCarbons(client, 'disable');
    client.markReceived = (msg: Message) => client.sendMarker(msg, 'received');
    client.markDisplayed = (msg: Message) => client.sendMarker(msg, 'displayed');
    client.markAcknowledged = (msg: Message) => client.sendMarker(msg, 'acknowledged');

    client.getAttention = (jid: string, opts: Partial<Message> = {}) => {
        return client.sendMessage({
            ...opts,
            requestingAttention: true,
            to: jid,
            type: 'headline'
        });
    };

    client.sendMarker = (msg: Message, marker: ChatMarkerLabel, force?: boolean): void => {
        if (!isMarkable(msg, marker) && !force) {
            return;
        }

        const useStanzaID = client.config.groupchatMarkersUseStanzaID !== false;

        let id = msg.id;
        if (msg.type === 'groupchat' && msg.stanzaIds && useStanzaID) {
            const mucStanzaId = msg.stanzaIds.find(s => JID.equalBare(s.by, msg.from));
            if (mucStanzaId) {
                id = mucStanzaId.id;
            }
        }

        client.sendMessage({
            marker: {
                id,
                type: marker
            },
            to: msg.type === 'groupchat' ? JID.toBare(msg.from) : msg.from,
            type: msg.type
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

        const sendReceipts = client.config.sendReceipts !== false;
        const sendMUCReceipts = client.config.sendMUCReceipts !== false;
        const sendMarkers = client.config.chatMarkers !== false;
        const useStanzaID = client.config.groupchatMarkersUseStanzaID !== false;

        const isReceipt = isReceiptRequest(msg);
        const isReceivedMarkable = isMarkable(msg, 'received');

        const canSendReceipt =
            isReceipt && sendReceipts && (msg.type === 'groupchat' ? sendMUCReceipts : true);

        if (canSendReceipt || (sendMarkers && isReceivedMarkable)) {
            const to = msg.type === 'groupchat' ? JID.toBare(msg.from) : msg.from;
            let markerId = msg.id;
            if (msg.type === 'groupchat' && msg.stanzaIds && useStanzaID) {
                const mucStanzaId = msg.stanzaIds.find(s => JID.equalBare(s.by, msg.from));
                if (mucStanzaId) {
                    markerId = mucStanzaId.id;
                }
            }

            client.sendMessage({
                id: msg.id,
                receipt: canSendReceipt
                    ? {
                          id: msg.id,
                          type: 'received'
                      }
                    : undefined,
                marker:
                    sendMarkers && isReceivedMarkable
                        ? {
                              id: markerId,
                              type: 'received'
                          }
                        : undefined,
                to,
                type: msg.type
            });
        }

        if (msg.receipt && msg.receipt.type === 'received') {
            client.emit('receipt', msg as ReceiptMessage);
        }
        if (msg.marker && msg.marker.type !== 'markable') {
            client.emit(`marker:${msg.marker.type}` as any, msg);
        }
    });
}
