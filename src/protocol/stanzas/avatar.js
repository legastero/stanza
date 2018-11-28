import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Avatar = JXT.define({
        element: 'info',
        fields: {
            bytes: Utils.attribute('bytes'),
            height: Utils.attribute('height'),
            id: Utils.attribute('id'),
            type: Utils.attribute('type', 'image/png'),
            url: Utils.attribute('url'),
            width: Utils.attribute('width')
        },
        name: 'avatar',
        namespace: NS.AVATAR_METADATA
    });

    const avatars = {
        get: function() {
            const metadata = Utils.find(this.xml, NS.AVATAR_METADATA, 'metadata');
            const results = [];
            if (metadata.length) {
                const avatarInfo = Utils.find(metadata[0], NS.AVATAR_METADATA, 'info');
                for (const info of avatarInfo) {
                    results.push(new Avatar({}, info));
                }
            }
            return results;
        },
        set: function(value) {
            const metadata = Utils.findOrCreate(this.xml, NS.AVATAR_METADATA, 'metadata');
            Utils.setAttribute(metadata, 'xmlns', NS.AVATAR_METADATA);
            for (const info of value) {
                const avatar = new Avatar(info);
                metadata.appendChild(avatar.xml);
            }
        }
    };

    JXT.withPubsubItem(function(Item) {
        JXT.add(Item, 'avatars', avatars);
        JXT.add(Item, 'avatarData', Utils.textSub(NS.AVATAR_DATA, 'data'));
    });
}
