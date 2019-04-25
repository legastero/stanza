import { timeoutPromise } from '../Utils';
import { Namespaces } from '../protocol';
import { JID } from '../protocol/jid';

export default function(client) {
    client.disco.addFeature(Namespaces.MAM_2);

    client.getHistorySearchForm = function(jid, cb) {
        return client.sendIq(
            {
                mam: true,
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.searchHistory = function(opts, cb) {
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
        for (const name of defaultFields) {
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
        }

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
            id: queryid,
            mam: opts,
            to: to,
            type: 'set'
        });

        return timeoutPromise(mamQuery, this.config.timeout * 1000 || 15000, () => ({
            error: {
                condition: 'timeout'
            },
            id: queryid,
            type: 'error'
        }))
            .then(mamRes => {
                mamRes.mamResult.items = results;
                this.off('mam:item:' + queryid);

                if (cb) {
                    cb(null, mamRes);
                }
                return mamRes;
            })
            .catch(err => {
                this.off('mam:item:' + queryid);
                if (cb) {
                    cb(err);
                } else {
                    throw err;
                }
            });
    };

    client.getHistoryPreferences = function(cb) {
        return this.sendIq(
            {
                mamPrefs: true,
                type: 'get'
            },
            cb
        );
    };

    client.setHistoryPreferences = function(opts, cb) {
        return this.sendIq(
            {
                mamPrefs: opts,
                type: 'set'
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
