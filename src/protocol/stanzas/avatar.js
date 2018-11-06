import * as NS from '../namespaces';
import each from 'lodash.foreach';

export default function(JXT) {
    const Utils = JXT.utils;

    const Avatar = JXT.define({
        name: 'avatar',
        namespace: NS.AVATAR_METADATA,
        element: 'info',
        fields: {
            id: Utils.attribute('id'),
            bytes: Utils.attribute('bytes'),
            height: Utils.attribute('height'),
            width: Utils.attribute('width'),
            type: Utils.attribute('type', 'image/png'),
            url: Utils.attribute('url')
        }
    });

    const avatars = {
        get: function() {
            const metadata = Utils.find(this.xml, NS.AVATAR_METADATA, 'metadata');
            const results = [];
            if (metadata.length) {
                const avatars = Utils.find(metadata[0], NS.AVATAR_METADATA, 'info');
                each(avatars, function(info) {
                    results.push(new Avatar({}, info));
                });
            }
            return results;
        },
        set: function(value) {
            const metadata = Utils.findOrCreate(this.xml, NS.AVATAR_METADATA, 'metadata');
            Utils.setAttribute(metadata, 'xmlns', NS.AVATAR_METADATA);
            each(value, function(info) {
                const avatar = new Avatar(info);
                metadata.appendChild(avatar.xml);
            });
        }
    };

    JXT.withPubsubItem(function(Item) {
        JXT.add(Item, 'avatars', avatars);
        JXT.add(Item, 'avatarData', Utils.textSub(NS.AVATAR_DATA, 'data'));
    });
}
