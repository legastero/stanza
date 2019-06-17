import { Agent } from '../';
import { NS_GEOLOC, NS_PEP_NOTIFY } from '../Namespaces';
import { Geolocation, IQ } from '../protocol';

declare module '../' {
    export interface Agent {
        publishGeoLoc(data: Geolocation): Promise<IQ>;
    }

    export interface AgentEvents {
        geoloc: GeolocEvent;
    }
}

export interface GeolocEvent {
    geoloc: Geolocation;
    jid: string;
}

export default function(client: Agent) {
    client.disco.addFeature(NS_GEOLOC);
    client.disco.addFeature(NS_PEP_NOTIFY(NS_GEOLOC));

    client.on('pubsub:published', msg => {
        if (msg.pubsub.items.node !== NS_GEOLOC) {
            return;
        }

        const loc = msg.pubsub.items.published[0]!.content as Geolocation;
        client.emit('geoloc', {
            geoloc: loc,
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
