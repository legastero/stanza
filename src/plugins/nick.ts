import { Agent } from '../Definitions';
import { NS_NICK, NS_PEP_NOTIFY } from '../protocol';
import { IQ, Message, UserNick } from '../protocol';

declare module '../Definitions' {
    export interface Agent {
        publishNick(nick: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_NICK);
    client.disco.addFeature(NS_PEP_NOTIFY(NS_NICK));

    client.on('pubsub:event', (msg: Message) => {
        if (!msg.pubsub || !msg.pubsub.items) {
            return;
        }
        if (msg.pubsub.items.node !== NS_NICK) {
            return;
        }
        if (!msg.pubsub.items.published) {
            return;
        }

        const content = msg.pubsub.items.published[0].content as UserNick;

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
