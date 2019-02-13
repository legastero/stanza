import { Agent } from '../Definitions';
import { NS_CHAT_MARKERS_0 } from '../protocol';
import * as JID from '../protocol/jid';
import { Message } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        markReceived(msg: Message): void;
        markDisplayed(msg: Message): void;
        markAcknowledged(msg: Message): void;
    }

    export interface AgentConfig {
        chatMarkers?: boolean;
    }
}

export default function(client: Agent) {
    function enabled(msg: Message) {
        return msg.marker && msg.marker.type === 'markable' && client.config.chatMarkers !== false;
    }

    client.disco.addFeature(NS_CHAT_MARKERS_0);

    client.on('message', (msg: Message) => {
        if (enabled(msg)) {
            client.markReceived(msg);
            return;
        }
        if (msg.marker && msg.marker.type !== 'markable') {
            client.emit(`marker:${msg.marker.type}`, msg);
        }
    });

    client.markReceived = (msg: Message) => {
        if (enabled(msg)) {
            const to = msg.type === 'groupchat' ? JID.bare(msg.from) : msg.from;
            client.sendMessage({
                body: '',
                marker: {
                    id: msg.id,
                    type: 'received'
                },
                to,
                type: msg.type
            });
        }
    };

    client.markDisplayed = (msg: Message) => {
        if (enabled(msg)) {
            const to = msg.type === 'groupchat' ? JID.bare(msg.from) : msg.from;
            client.sendMessage({
                body: '',
                marker: {
                    id: msg.id,
                    type: 'displayed'
                },
                type: msg.type
            });
        }
    };

    client.markAcknowledged = (msg: Message) => {
        if (enabled(msg)) {
            const to = msg.type === 'groupchat' ? JID.bare(msg.from) : msg.from;
            client.sendMessage({
                body: '',
                marker: {
                    id: msg.id,
                    type: 'acknowledged'
                },
                to,
                type: msg.type
            });
        }
    };
}
