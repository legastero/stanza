import { Agent } from '../Definitions';
import { NS_PEP_NOTIFY, NS_REACH_0 } from '../protocol';
import { IQ, Message, Presence, ReachabilityAddress, UserReachability } from '../protocol';

declare module '../Definitions' {
    export interface Agent {
        publishReachability(data: ReachabilityAddress[]): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_REACH_0);
    client.disco.addFeature(NS_PEP_NOTIFY(NS_REACH_0));

    client.on('pubsub:event', (msg: Message) => {
        if (!msg.pubsub || !msg.pubsub.items) {
            return;
        }
        if (msg.pubsub.items.node !== NS_REACH_0) {
            return;
        }
        if (!msg.pubsub.items.published) {
            return;
        }

        const content = msg.pubsub.items.published[0].content as UserReachability;

        client.emit('reachability', {
            addresses: content.reachabilityAddresses || [],
            jid: msg.from
        });
    });

    client.on('presence', (pres: Presence) => {
        if (!pres.reachabilityAddresses || !pres.reachabilityAddresses.length) {
            return;
        }

        client.emit('reachability', {
            addresses: pres.reachabilityAddresses,
            jid: pres.from
        });
    });

    client.publishReachability = (data: ReachabilityAddress[]) => {
        return client.publish<UserReachability>('', NS_REACH_0, {
            itemType: NS_REACH_0,
            reachabilityAddresses: data
        });
    };
}
