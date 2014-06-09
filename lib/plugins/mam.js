'use strict';

require('../stanza/mam');

var JID = require('../jid');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:mam:tmp');

    client.getHistory = function (opts, cb) {
        var self = this;
        var queryid = this.nextId();

        opts = opts || {};
        opts.queryid = queryid;

        var to = opts.to || '';
        delete opts.to;

        var dest = new JID(to || client.jid.bare);
        var allowed = {};
        allowed[''] = true;
        allowed[dest.full] = true;
        allowed[dest.bare] = true;
        allowed[dest.domain] = true;
        allowed[client.jid.bare] = true;
        allowed[client.jid.domain] = true;

        var mamResults = [];
        this.on('mam:' + queryid, 'session', function (msg) {
            if (!allowed[msg.from.full]) {
                return;
            }
            mamResults.push(msg);
        });

        return this.sendIq({
            type: 'get',
            to: to,
            id: queryid,
            mamQuery: opts
        }).then(function (resp) {
            resp.mamQuery.results = mamResults;
            return resp;
        }).finally(function () {
            self.off('mam:' + queryid);
        }).nodeify(cb);
    };

    client.getHistoryPreferences = function (cb) {
        return this.sendIq({
            type: 'get',
            mamPrefs: true
        }, cb);
    };

    client.setHistoryPreferences = function (opts, cb) {
        return this.sendIq({
            type: 'set',
            mamPrefs: opts
        }, cb);
    };

    client.on('message', function (msg) {
        if (msg.mam) {
            client.emit('mam:' + msg.mam.queryid, msg);
        }
    });
};
