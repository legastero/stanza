"use strict";

var stanzas = require('../stanza/mam');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:mam:tmp');

    client.getHistory = function (opts, cb) {
        var self = this;
        var queryid = this.nextId();

        opts = opts || {};
        opts.queryid = queryid;

        var mamResults = [];
        this.on('mam:' + queryid, 'session', function (msg) {
            mamResults.push(msg);
        });

        return this.sendIq({
            type: 'get',
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
            mamPrefs: {}
        }, cb);
    };

    client.setHistoryPreferences = function (opts, cb) {
        return this.sendIq({
            type: 'set',
            mamPrefs: opts
        }, cb);
    };

    client.on('message', function (msg) {
        if (msg._extensions.mam) {
            client.emit('mam:' + msg.mam.queryid, msg);
        }
    });
};
