export default function(client) {
    client.on('iq:set:roster', function(iq) {
        const allowed = {};
        allowed[''] = true;
        allowed[client.jid.bare] = true;
        allowed[client.jid.domain] = true;

        if (!allowed[iq.from.full]) {
            return client.sendIq(
                iq.errorReply({
                    error: {
                        condition: 'service-unavailable',
                        type: 'cancel'
                    }
                })
            );
        }

        client.emit('roster:update', iq);
        client.sendIq({
            id: iq.id,
            type: 'result'
        });
    });

    client.getRoster = function(cb) {
        return client
            .sendIq({
                roster: {
                    ver: this.config.rosterVer
                },
                type: 'get'
            })
            .then(resp => {
                if (resp.roster) {
                    const ver = resp.roster.ver;
                    if (ver) {
                        this.config.rosterVer = ver;
                        this.emit('roster:ver', ver);
                    }
                }
                return resp;
            })
            .then(
                function(result) {
                    if (cb) {
                        cb(null, result);
                    }
                    return result;
                },
                function(err) {
                    if (cb) {
                        cb(err);
                    } else {
                        throw err;
                    }
                }
            );
    };

    client.updateRosterItem = function(item, cb) {
        return client.sendIq(
            {
                roster: {
                    items: [item]
                },
                type: 'set'
            },
            cb
        );
    };

    client.removeRosterItem = function(jid, cb) {
        return client.updateRosterItem({ jid: jid, subscription: 'remove' }, cb);
    };

    client.subscribe = function(jid) {
        client.sendPresence({ type: 'subscribe', to: jid });
    };

    client.unsubscribe = function(jid) {
        client.sendPresence({ type: 'unsubscribe', to: jid });
    };

    client.acceptSubscription = function(jid) {
        client.sendPresence({ type: 'subscribed', to: jid });
    };

    client.denySubscription = function(jid) {
        client.sendPresence({ type: 'unsubscribed', to: jid });
    };
}
