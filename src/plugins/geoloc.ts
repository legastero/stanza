import { Agent } from '../Definitions';
import { NS_GEOLOC, NS_PEP_NOTIFY } from '../protocol';
import { Geolocation, IQ, Message } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        publishGeoLoc(data: Geolocation): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_GEOLOC);
    client.disco.addFeature(NS_PEP_NOTIFY(NS_GEOLOC));

    client.on('pubsub:event', (msg: Message) => {
        if (!msg.pubsub || !msg.pubsub.items) {
            return;
        }
        if (msg.pubsub.items.node !== NS_GEOLOC) {
            return;
        }
        if (!msg.pubsub.items.published) {
            return;
        }

        client.emit('geoloc', {
            geoloc: msg.pubsub.items.published[0]!.content,
            jid: msg.from
        });
    });

    client.publishGeoLoc = (data: Geolocation): Promise<IQ> => {
        return client.publish('', NS_GEOLOC, {
            itemType: NS_GEOLOC,
            ...data
        });
    };
}
