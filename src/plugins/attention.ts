import { Agent } from '../';
import { Message, NS_ATTENTION_0, ReceivedMessage } from '../protocol';

declare module '../' {
    export interface Agent {
        getAttention(jid: string, opts?: Partial<Message>): void;
    }

    export interface AgentEvents {
        attention: ReceivedMessage;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_ATTENTION_0);

    client.getAttention = (jid: string, opts: Partial<Message> = {}) => {
        return client.sendMessage({
            ...opts,
            requestingAttention: true,
            to: jid,
            type: 'headline'
        });
    };

    client.on('message', msg => {
        if (msg.requestingAttention) {
            client.emit('attention', msg);
        }
    });
}
