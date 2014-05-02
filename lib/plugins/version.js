'use strict';

require('../stanza/version');


module.exports = function (client) {
    client.disco.addFeature('jabber:iq:version');

    client.on('iq:get:version', function (iq) {
        client.sendIq(iq.resultReply({
            version: client.config.version || {
                name: 'stanza.io'
            }
        }));
    });

    client.getSoftwareVersion = function (jid, cb) {
        return this.sendIq({
            to: jid,
            type: 'get',
            version: {}
        }, cb);
    };
};
