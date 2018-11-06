import { JID } from 'xmpp-jid';

import { Namespaces } from '../protocol';

function timeoutPromise(targetPromise, queryid, delay) {
    let timeoutRef;
    return Promise.race([
        targetPromise,
        new Promise(function(resolve, reject) {
            timeoutRef = setTimeout(function() {
                reject({
                    id: queryid,
                    type: 'error',
                    error: {
                        condition: 'timeout'
                    }
                });
            }, delay);
        })
    ]).then(function(result) {
        clearTimeout(timeoutRef);
        return result;
    });
}

export default function(client) {
    client.disco.addFeature(Namespaces.MAM_2);

    client.getHistorySearchForm = function(jid, cb) {
        return client.sendIq(
            {
                to: jid,
                type: 'get',
                mam: true
            },
            cb
        );
    };

    client.searchHistory = function(opts, cb) {
        const self = this;
        const queryid = this.nextId();

        opts = opts || {};
        opts.queryid = queryid;

        const to = opts.jid || opts.to || '';
        delete opts.jid;
        delete opts.to;

        if (!opts.form) {
            opts.form = {};
        }
        opts.form.type = 'submit';
        const fields = (opts.form.fields = opts.form.fields || []);

        const defaultFields = ['FORM_TYPE', 'with', 'start', 'end'];
        defaultFields.forEach(function(name) {
            if (opts[name] || name === 'FORM_TYPE') {
                let val = opts[name];
                const isDate = name === 'start' || name === 'end';
                if (isDate && typeof val !== 'string') {
                    val = val.toISOString();
                }
                if (name === 'FORM_TYPE') {
                    val = Namespaces.MAM_2;
                }

                const existing = false;
                for (let i = 0, len = fields.length; i < len; i++) {
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

        const dest = new JID(to || client.jid.bare);
        const allowed = {};
        allowed[''] = true;
        allowed[dest.full] = true;
        allowed[dest.bare] = true;
        allowed[dest.domain] = true;
        allowed[client.jid.bare] = true;
        allowed[client.jid.domain] = true;

        const results = [];

        this.on('mam:item:' + queryid, 'session', function(msg) {
            if (!allowed[msg.from.full]) {
                return;
            }
            results.push(msg.mamItem);
        });

        const mamQuery = this.sendIq({
            type: 'set',
            to: to,
            id: queryid,
            mam: opts
        });

        return timeoutPromise(mamQuery, queryid, self.config.timeout * 1000 || 15000).then(
            function(mamRes) {
                mamRes.mamResult.items = results;
                self.off('mam:item:' + queryid);

                if (cb) {
                    cb(null, mamRes);
                }
                return mamRes;
            },
            function(err) {
                self.off('mam:item:' + queryid);
                if (cb) {
                    cb(err);
                } else {
                    throw err;
                }
            }
        );
    };

    client.getHistoryPreferences = function(cb) {
        return this.sendIq(
            {
                type: 'get',
                mamPrefs: true
            },
            cb
        );
    };

    client.setHistoryPreferences = function(opts, cb) {
        return this.sendIq(
            {
                type: 'set',
                mamPrefs: opts
            },
            cb
        );
    };

    client.on('message', function(msg) {
        if (msg.mamItem) {
            client.emit('mam:item', msg);
            client.emit('mam:item:' + msg.mamItem.queryid, msg);
        }
    });
}
