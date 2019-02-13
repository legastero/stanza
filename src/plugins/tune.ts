import { Agent } from '../Definitions';
import { NS_PEP_NOTIFY, NS_TUNE } from '../protocol';
import { IQ, Message, UserTune } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        publishTune(tune: UserTune): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_TUNE);
    client.disco.addFeature(NS_PEP_NOTIFY(NS_TUNE));

    client.on('pubsub:event', (msg: Message) => {
        if (!msg.pubsub || !msg.pubsub.items) {
            return;
        }
        if (msg.pubsub.items.node !== NS_TUNE) {
            return;
        }
        if (!msg.pubsub.items.published) {
            return;
        }

        client.emit('tune', {
            jid: msg.from,
            tune: msg.pubsub.items.published[0].content
        });
    });

    client.publishTune = (tune: UserTune) => {
        return client.publish('', NS_TUNE, {
            itemType: NS_TUNE,
            ...tune
        });
    };
}
