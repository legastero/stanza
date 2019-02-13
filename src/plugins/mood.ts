import { Agent } from '../Definitions';
import { NS_MOOD, NS_PEP_NOTIFY } from '../protocol';
import { IQ, Message, UserMood } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        publishMood(mood: UserMood): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_MOOD);
    client.disco.addFeature(NS_PEP_NOTIFY(NS_MOOD));

    client.on('pubsub:event', (msg: Message) => {
        if (!msg.pubsub || !msg.pubsub.items) {
            return;
        }
        if (msg.pubsub.items.node !== NS_MOOD) {
            return;
        }
        if (!msg.pubsub.items.published) {
            return;
        }

        client.emit('mood', {
            jid: msg.from,
            mood: msg.pubsub.items.published[0].content
        });
    });

    client.publishMood = (mood: UserMood) => {
        return client.publish('', NS_MOOD, {
            itemType: NS_MOOD,
            ...mood
        });
    };
}
