import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Conference = JXT.define({
        name: '_conference',
        namespace: NS.BOOKMARKS,
        element: 'conference',
        fields: {
            name: Utils.attribute('name'),
            autoJoin: Utils.boolAttribute('autojoin'),
            jid: Utils.jidAttribute('jid'),
            nick: Utils.textSub(NS.BOOKMARKS, 'nick')
        }
    });

    const Bookmarks = JXT.define({
        name: 'bookmarks',
        namespace: NS.BOOKMARKS,
        element: 'storage'
    });

    JXT.extend(Bookmarks, Conference, 'conferences');

    JXT.withDefinition('query', NS.PRIVATE, function(PrivateStorage) {
        JXT.extend(PrivateStorage, Bookmarks);
    });
}
