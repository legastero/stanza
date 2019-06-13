import { Agent } from '../';
import { NS_PEP_NOTIFY, NS_TUNE } from '../protocol';
import { IQ, Message, UserTune } from '../protocol';

declare module '../' {
    export interface Agent {
        publishTune(tune: UserTune): Promise<IQ>;
    }

    export interface AgentEvents {
        tune: TuneEvent;
    }
}

export interface TuneEvent {
    tune: UserTune;
    jid: string;
}

export default function(client: Agent) {
    client.disco.addFeature(NS_TUNE);
    client.disco.addFeature(NS_PEP_NOTIFY(NS_TUNE));

    client.on('pubsub:published', msg => {
        if (msg.pubsub.items.node !== NS_TUNE) {
            return;
        }

        client.emit('tune', {
            jid: msg.from,
            tune: msg.pubsub.items.published[0].content as UserTune
        });
    });

    client.publishTune = (tune: UserTune) => {
        return client.publish('', NS_TUNE, {
            itemType: NS_TUNE,
            ...tune
        });
    };
}
