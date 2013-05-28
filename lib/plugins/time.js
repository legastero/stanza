var stanzas = require('../stanza/time');


exports.init = function (client) {
    client.disco.addFeature('', 'urn:xmpp:time');

    client.time = {
        get: function (jid, cb) {
            client.sendIq({
                to: jid,
                type: 'get',
                time: true
            }, cb);
        }
    }

    client.on('iq:get:time', function (iq) {
        var time = new Date();
        client.sendIq(iq.resultReply({
            time: {
                utc: time,
                tzo: time.getTimezoneOffset()
            }
        }));
    });
};
