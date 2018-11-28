export default function(client) {
    client.on('message', function(msg) {
        if (msg.event) {
            client.emit('pubsub:event', msg);
            client.emit('pubsubEvent', msg);

            if (msg.event.updated) {
                const published = msg.event.updated.published;
                const retracted = msg.event.updated.retracted;

                if (published && published.length) {
                    client.emit('pubsub:published', msg);
                }

                if (retracted && retracted.length) {
                    client.emit('pubsub:retracted', msg);
                }
            }

            if (msg.event.purged) {
                client.emit('pubsub:purged', msg);
            }

            if (msg.event.deleted) {
                client.emit('pubsub:deleted', msg);
            }

            if (msg.event.subscriptionChanged) {
                client.emit('pubsub:subscription', msg);
            }

            if (msg.event.configurationChanged) {
                client.emit('pubsub:config', msg);
            }
        }

        if (msg.pubsub && msg.pubsub.affiliations) {
            client.emit('pubsub:affiliation', msg);
        }
    });

    client.subscribeToNode = function(jid, opts, cb) {
        if (typeof opts === 'string') {
            opts = {
                node: opts
            };
        }
        opts.jid = opts.jid || client.jid;

        return this.sendIq(
            {
                pubsub: {
                    subscribe: opts
                },
                to: jid,
                type: 'set'
            },
            cb
        );
    };

    client.unsubscribeFromNode = function(jid, opts, cb) {
        if (typeof opts === 'string') {
            opts = {
                node: opts
            };
        }
        opts.jid = opts.jid || client.jid.bare;

        return this.sendIq(
            {
                pubsub: {
                    unsubscribe: opts
                },
                to: jid,
                type: 'set'
            },
            cb
        );
    };

    client.publish = function(jid, node, item, cb) {
        return this.sendIq(
            {
                pubsub: {
                    publish: {
                        item: item,
                        node: node
                    }
                },
                to: jid,
                type: 'set'
            },
            cb
        );
    };

    client.getItem = function(jid, node, id, cb) {
        return this.sendIq(
            {
                pubsub: {
                    retrieve: {
                        item: {
                            id: id
                        },
                        node: node
                    }
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.getItems = function(jid, node, opts, cb) {
        opts = opts || {};
        opts.node = node;
        return this.sendIq(
            {
                pubsub: {
                    retrieve: {
                        max: opts.max,
                        node: node
                    },
                    rsm: opts.rsm
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.retract = function(jid, node, id, notify, cb) {
        return this.sendIq(
            {
                pubsub: {
                    retract: {
                        id: id,
                        node: node,
                        notify: notify
                    }
                },
                to: jid,
                type: 'set'
            },
            cb
        );
    };

    client.purgeNode = function(jid, node, cb) {
        return this.sendIq(
            {
                pubsubOwner: {
                    purge: node
                },
                to: jid,
                type: 'set'
            },
            cb
        );
    };

    client.deleteNode = function(jid, node, cb) {
        return this.sendIq(
            {
                pubsubOwner: {
                    del: node
                },
                to: jid,
                type: 'set'
            },
            cb
        );
    };

    client.createNode = function(jid, node, config, cb) {
        const cmd = {
            pubsub: {
                create: node
            },
            to: jid,
            type: 'set'
        };

        if (config) {
            cmd.pubsub.config = { form: config };
        }

        return this.sendIq(cmd, cb);
    };

    client.getSubscriptions = function(jid, opts, cb) {
        opts = opts || {};

        return this.sendIq(
            {
                pubsub: {
                    subscriptions: opts
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.getAffiliations = function(jid, opts, cb) {
        opts = opts || {};

        return this.sendIq(
            {
                pubsub: {
                    affiliations: opts
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.getNodeSubscribers = function(jid, node, opts, cb) {
        opts = opts || {};
        opts.node = node;

        return this.sendIq(
            {
                pubsubOwner: {
                    subscriptions: opts
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.updateNodeSubscriptions = function(jid, node, delta, cb) {
        return this.sendIq(
            {
                pubsubOwner: {
                    subscriptions: {
                        list: delta,
                        node: node
                    }
                },
                to: jid,
                type: 'set'
            },
            cb
        );
    };

    client.getNodeAffiliations = function(jid, node, opts, cb) {
        opts = opts || {};
        opts.node = node;

        return this.sendIq(
            {
                pubsubOwner: {
                    affiliations: opts
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.updateNodeAffiliations = function(jid, node, delta, cb) {
        return this.sendIq(
            {
                pubsubOwner: {
                    affiliations: {
                        list: delta,
                        node: node
                    }
                },
                to: jid,
                type: 'set'
            },
            cb
        );
    };
}
