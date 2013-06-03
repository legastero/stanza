var stanzas = require('../stanza/mam');


exports.init = function (client) {
    client.disco.addFeature('', 'urn:xmpp:mam:tmp');

    client.getHistory = function (opts, cb) {
        var opts = opts || {},
            queryid = this.nextId(),
            self = this;
        opts.queryid = queryid;

        var mamResults = [];
        this.on('mam:' + queryid, 'session', function (msg) {
            mamResults.push(msg);
        });

        this.sendIq({
            type: 'get',
            id: queryid,
            mamQuery: opts
        }, function (resp) {
            self.off('mam:' + queryid);
            resp.mamQuery.results = mamResults;
            (cb || function () {})(resp);
        });
    };

    client.on('message', function (msg) {
        if (msg._extensions.mam) {
            client.emit('mam:' + msg.mam.queryid, msg);
        }
    });
};
