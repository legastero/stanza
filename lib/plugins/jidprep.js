'use strict';


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/jidprep'));

    client.prepJID = function (jid, cb) {
        return client.sendIq({
            to: client.jid.domain,
            type: 'get',
            jidPrep: jid
        }, cb);
    };
};
