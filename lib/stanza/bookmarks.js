'use strict';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Conference = stanza.define({
        name: '_conference',
        namespace: 'storage:bookmarks',
        element: 'conference',
        fields: {
            name: types.attribute('name'),
            autoJoin: types.boolAttribute('autojoin'),
            jid: types.jidAttribute('jid'),
            nick: types.textSub('storage:bookmarks', 'nick')
        }
    });
    
    var Bookmarks = stanza.define({
        name: 'bookmarks',
        namespace: 'storage:bookmarks',
        element: 'storage'
    });
    
    
    stanza.extend(Bookmarks, Conference, 'conferences');

    stanza.withDefinition('query', 'jabber:iq:private', function (PrivateStorage) {
        stanza.extend(PrivateStorage, Bookmarks);
    });
};
