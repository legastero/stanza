var stanza = require('jxt');
var util = require('./util');
var PrivateStorage = require('./private');


var Conference = stanza.define({
    name: 'conference',
    namespace: 'storage:bookmarks',
    element: 'conference',
    fields: {
        name: stanza.attribute('name'),
        autoJoin: stanza.boolAttribute('autojoin'),
        jid: util.jidAttribute('jid'),
        nick: stanza.subText('storage:bookmarks', 'nick')
    }
});

var Bookmarks = module.exports = stanza.define({
    name: 'bookmarks',
    namespace: 'storage:bookmarks',
    element: 'storage'
});


stanza.extend(PrivateStorage, Bookmarks);
stanza.extend(Bookmarks, Conference, 'conferences');
