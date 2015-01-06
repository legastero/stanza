'use strict';

var _ = require('underscore');


module.exports = function (stanza) {
    var types = stanza.utils;

    var Avatar = stanza.define({
        name: 'avatar',
        namespace: 'urn:xmpp:avatar:metadata',
        element: 'info',
        fields: {
            id: types.attribute('id'),
            bytes: types.attribute('bytes'),
            height: types.attribute('height'),
            width: types.attribute('width'),
            type: types.attribute('type', 'image/png'),
            url: types.attribute('url')
        }
    });
    
    var avatars = {
        get: function () {
            var metadata = types.find(this.xml, 'urn:xmpp:avatar:metadata', 'metadata');
            var results = [];
            if (metadata.length) {
                var avatars = types.find(metadata[0], 'urn:xmpp:avatar:metadata', 'info');
                _.forEach(avatars, function (info) {
                    results.push(new Avatar({}, info));
                });
            }
            return results;
        },
        set: function (value) {
            var metadata = types.findOrCreate(this.xml, 'urn:xmpp:avatar:metadata', 'metadata');
            types.setAttribute(metadata, 'xmlns', 'urn:xmpp:avatar:metadata');
            _.forEach(value, function (info) {
                var avatar = new Avatar(info);
                metadata.appendChild(avatar.xml);
            });
        }
    };
    
    stanza.withPubsubItem(function (Item) {
        stanza.add(Item, 'avatars', avatars);
        stanza.add(Item, 'avatarData', types.textSub('urn:xmpp:avatar:data', 'data'));
    });
};
