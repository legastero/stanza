import { Namespaces } from '../protocol';


export default function (client) {

    client.disco.addFeature(`${Namespaces.AVATAR_METADATA}+notify`);

    client.on('pubsub:event', function (msg) {
        if (!msg.event.updated) {
            return;
        }
        if (msg.event.updated.node !== Namespaces.AVATAR_METADATA) {
            return;
        }

        client.emit('avatar', {
            jid: msg.from,
            source: 'pubsub',
            avatars: msg.event.updated.published[0].avatars
        });
    });

    client.on('presence', function (pres) {
        if (pres.avatarId) {
            client.emit('avatar', {
                jid: pres.from,
                source: 'vcard',
                avatars: [{
                    id: pres.avatarId
                }]
            });
        }
    });

    client.publishAvatar = function (id, data, cb) {
        return this.publish('', Namespaces.AVATAR_DATA, {
            id: id,
            avatarData: data
        }, cb);
    };

    client.useAvatars = function (info, cb) {
        return this.publish('', Namespaces.AVATAR_METADATA, {
            id: 'current',
            avatars: info
        }, cb);
    };

    client.getAvatar = function (jid, id, cb) {
        return this.getItem(jid, Namespaces.AVATAR_DATA, id, cb);
    };
}
