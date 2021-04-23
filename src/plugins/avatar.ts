import { Agent } from '../';
import { NS_AVATAR_DATA, NS_AVATAR_METADATA, NS_PEP_NOTIFY } from '../Namespaces';
import {
    AvatarData,
    AvatarMetaData,
    AvatarPointer,
    AvatarVersion,
    IQ,
    PubsubItem
} from '../protocol';

declare module '../' {
    export interface Agent {
        publishAvatar(id: string, data: Buffer): Promise<IQ>;
        useAvatars(versions: AvatarVersion[], pointers?: AvatarPointer[]): Promise<IQ>;
        getAvatar(jid: string, id: string): Promise<PubsubItem<AvatarData>>;
    }

    export interface AgentEvents {
        avatar: AvatarsEvent;
    }
}

export interface AvatarsEvent {
    avatars: AvatarVersion[];
    jid: string;
    source: 'pubsub' | 'vcard';
}

export default function (client: Agent): void {
    client.disco.addFeature(NS_PEP_NOTIFY(NS_AVATAR_METADATA));

    client.on('pubsub:published', msg => {
        if (msg.pubsub.items.node !== NS_AVATAR_METADATA) {
            return;
        }

        const info = msg.pubsub.items.published[0].content as AvatarMetaData;

        client.emit('avatar', {
            avatars: info.versions || [],
            jid: msg.from,
            source: 'pubsub'
        });
    });

    client.on('presence', pres => {
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

    client.useAvatars = (versions: AvatarVersion[], pointers: AvatarPointer[] = []) => {
        return client.publish(
            '',
            NS_AVATAR_METADATA,
            {
                itemType: NS_AVATAR_METADATA,
                pointers,
                versions
            },
            'current'
        );
    };

    client.getAvatar = (jid: string, id: string) => {
        return client.getItem<AvatarData>(jid, NS_AVATAR_DATA, id);
    };
}
