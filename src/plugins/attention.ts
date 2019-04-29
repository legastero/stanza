import { Agent } from '../';
import { Message, NS_ATTENTION_0 } from '../protocol';

declare module '../' {
    export interface Agent {
        getAttention(jid: string, opts?: Partial<Message>): void;
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

    client.on('message', (msg: Message) => {
        if (msg.requestingAttention) {
            client.emit('attention', msg);
        }
    });
}
