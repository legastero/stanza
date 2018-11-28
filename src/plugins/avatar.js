import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.PEP_NOTIFY(Namespaces.AVATAR_METADATA));

    client.on('pubsub:event', function(msg) {
        if (!msg.event.updated) {
            return;
        }
        if (msg.event.updated.node !== Namespaces.AVATAR_METADATA) {
            return;
        }

        client.emit('avatar', {
            avatars: msg.event.updated.published[0].avatars,
            jid: msg.from,
            source: 'pubsub'
        });
    });

    client.on('presence', function(pres) {
        if (pres.avatarId) {
            client.emit('avatar', {
                avatars: [
                    {
                        id: pres.avatarId
                    }
                ],
                jid: pres.from,
                source: 'vcard'
            });
        }
    });

    client.publishAvatar = function(id, data, cb) {
        return this.publish(
            '',
            Namespaces.AVATAR_DATA,
            {
                avatarData: data,
                id: id
            },
            cb
        );
    };

    client.useAvatars = function(info, cb) {
        return this.publish(
            '',
            Namespaces.AVATAR_METADATA,
            {
                avatars: info,
                id: 'current'
            },
            cb
        );
    };

    client.getAvatar = function(jid, id, cb) {
        return this.getItem(jid, Namespaces.AVATAR_DATA, id, cb);
    };
}
