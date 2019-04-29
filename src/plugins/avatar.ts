import { Agent } from '../';
import {
    AvatarMetaData,
    IQ,
    Message,
    NS_AVATAR_DATA,
    NS_AVATAR_METADATA,
    NS_PEP_NOTIFY,
    Presence
} from '../protocol';

declare module '../' {
    export interface Agent {
        publishAvatar(id: string, data: Buffer): Promise<IQ>;
        useAvatars(info: AvatarMetaData): Promise<IQ>;
        getAvatar(jid: string, id: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_PEP_NOTIFY(NS_AVATAR_METADATA));

    client.on('pubsub:event', (msg: Message) => {
        if (!msg.pubsub || !msg.pubsub.items) {
            return;
        }
        if (msg.pubsub.items.node !== NS_AVATAR_METADATA) {
            return;
        }
        if (!msg.pubsub.items.published) {
            return;
        }

        client.emit('geoloc', {
            geoloc: msg.pubsub.items.published[0]!.content,
            jid: msg.from,
            source: 'pubsub'
        });
    });

    client.on('presence', (pres: Presence) => {
        if (pres.vcardAvatar && typeof pres.vcardAvatar === 'string') {
            client.emit('avatar', {
                avatars: [
                    {
                        id: pres.vcardAvatar
                    }
                ],
                jid: pres.from,
                source: 'vcard'
            });
        }
    });

    client.publishAvatar = (id: string, data: Buffer) => {
        return client.publish(
            '',
            NS_AVATAR_DATA,
            {
                data,
                itemType: NS_AVATAR_DATA
            },
            id
        );
    };

    client.useAvatars = (info: AvatarMetaData) => {
        return client.publish(
            '',
            NS_AVATAR_METADATA,
            {
                itemType: NS_AVATAR_METADATA,
                ...info
            },
            'current'
        );
    };

    client.getAvatar = (jid: string, id: string) => {
        return client.getItem(jid, NS_AVATAR_DATA, id);
    };
}
