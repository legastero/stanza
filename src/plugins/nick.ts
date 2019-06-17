import { Agent } from '../';
import { NS_NICK, NS_PEP_NOTIFY } from '../Namespaces';
import { IQ, UserNick } from '../protocol';

declare module '../' {
    export interface Agent {
        publishNick(nick: string): Promise<IQ>;
    }

    export interface AgentEvents {
        nick: UserNickEvent;
    }
}

export interface UserNickEvent {
    jid: string;
    nick?: string;
}

export default function(client: Agent) {
    client.disco.addFeature(NS_NICK);
    client.disco.addFeature(NS_PEP_NOTIFY(NS_NICK));

    client.on('pubsub:published', msg => {
        if (msg.pubsub.items.node !== NS_NICK) {
            return;
        }

        const content = msg.pubsub.items.published[0]!.content as UserNick;

        client.emit('nick', {
            jid: msg.from,
            nick: content.nick
        });
    });

    client.publishNick = (nick: string) => {
        return client.publish<UserNick>('', NS_NICK, {
            itemType: NS_NICK,
            nick
        });
    };
}
