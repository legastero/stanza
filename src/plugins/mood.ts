import { Agent } from '../';
import { NS_MOOD, NS_PEP_NOTIFY } from '../protocol';
import { IQ, Message, UserMood } from '../protocol';

declare module '../' {
    export interface Agent {
        publishMood(mood: UserMood): Promise<IQ>;
    }
    export interface AgentEvents {
        mood: UserMoodEvent;
    }
}

export interface UserMoodEvent {
    jid: string;
    mood?: UserMood;
}

export default function(client: Agent) {
    client.disco.addFeature(NS_MOOD);
    client.disco.addFeature(NS_PEP_NOTIFY(NS_MOOD));

    client.on('pubsub:published', msg => {
        if (msg.pubsub.items.node !== NS_MOOD) {
            return;
        }

        const content = msg.pubsub.items.published[0]!.content as UserMood;

        client.emit('mood', {
            jid: msg.from,
            mood: content
        });
    });

    client.publishMood = (mood: UserMood) => {
        return client.publish('', NS_MOOD, {
            itemType: NS_MOOD,
            ...mood
        });
    };
}
