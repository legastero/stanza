var stanzas = require('../stanza/mam');


exports.init = function (client) {
    client.disco.addFeature('', 'urn:xmpp:mam:tmp');

    client.mam = {
        getHistory: function (opts, cb) {
            var opts = opts || {},
                queryid = client.nextId();
            opts.queryid = queryid;

            var mamResults = [];
            client.on('mam:' + queryid, 'session', function (msg) {
                mamResults.push(msg);
            });

            client.sendIq({
                type: 'get',
                id: queryid,
                mamQuery: opts
            }, function (resp) {
                client.off('mam:' + queryid);
                resp.mamQuery.results = mamResults;
                (cb || function () {})(resp);
            });
        }
    };

    client.on('message', function (msg) {
        if (msg._extensions.mam) {
            client.emit('mam:' + msg.mam.queryid, msg);
        }
    });
};
