'use strict';

var BPromise = require('bluebird');
var JID = require('xmpp-jid').JID;


module.exports = function (client) {

    client.disco.addFeature('urn:xmpp:mam:0');

    client.getHistorySearchForm = function (jid, cb) {
        return client.sendIq({
            to: jid,
            type: 'get',
            mam: true
        }, cb);
    };

    client.searchHistory = function (opts, cb) {
        var self = this;
        var queryid = this.nextId();

        opts = opts || {};
        opts.queryid = queryid;

        var to = opts.jid || opts.to || '';
        delete opts.jid;
        delete opts.to;

        if (!opts.form) {
            opts.form = {};
        }
        opts.form.type = 'submit';
        var fields = opts.form.fields = opts.form.fields || [];

        var defaultFields = ['FORM_TYPE', 'with', 'start', 'end'];
        defaultFields.forEach(function (name) {
            if (opts[name] || name === 'FORM_TYPE') {
                var val = opts[name];
                var isDate = (name === 'start' || name === 'end');
                if (isDate && typeof val !== 'string') {
                    val = val.toISOString();
                }
                if (name === 'FORM_TYPE') {
                    val = 'urn:xmpp:mam:0';
                }

                var existing = false;
                for (var i = 0, len = fields.length; i < len; i++) {
                    if (fields[i].name === name) {
                        continue;
                    }
                }

                if (!existing) {
                    fields.push({
                        name: name,
                        value: val
                    });
                }

                delete opts[name];
            }
        });

        var dest = new JID(to || client.jid.bare);
        var allowed = {};
        allowed[''] = true;
        allowed[dest.full] = true;
        allowed[dest.bare] = true;
        allowed[dest.domain] = true;
        allowed[client.jid.bare] = true;
        allowed[client.jid.domain] = true;

        var results = [];

        this.on('mam:item:' + queryid, 'session', function (msg) {
            if (!allowed[msg.from.full]) {
                return;
            }
            results.push(msg.mamItem);
        });

        var collectResults = new BPromise(function (resolve) {
            self.once('mam:result:' + queryid, 'session', function (msg) {
                if (!allowed[msg.from.full]) {
                    return;
                }
                msg.mamResult.items = results;
                resolve(msg);
            });
        });

        var mamQuery = this.sendIq({
            type: 'set',
            to: to,
            id: queryid,
            mam: opts
        });

        return BPromise.all([mamQuery, collectResults])
            .spread(function (iqRes, mamRes) {
                return mamRes;
            })
            .timeout(self.config.timeout * 1000 || 15000)
            .catch(BPromise.TimeoutError, function () {
                throw {
                    id: queryid,
                    type: 'error',
                    error: {
                        condition: 'timeout'
                    }
                };
            })
            .finally(function () {
                self.off('mam:item:' + queryid);
                self.off('mam:result:' + queryid);
            })
            .nodeify(cb);
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
        if (msg.mamItem) {
            client.emit('mam:item:' + msg.mamItem.queryid, msg);
        }
        if (msg.mamResult) {
            client.emit('mam:result:' + msg.mamResult.queryid, msg);
        }
    });
};
