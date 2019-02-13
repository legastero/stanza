import { Agent } from '../Definitions';
import { NS_SHIM } from '../protocol';
import {
    DataForm,
    IQ,
    Message,
    Paging,
    PubsubAffiliation,
    PubsubItemContent,
    PubsubSubscribe,
    PubsubSubscription,
    PubsubSubscriptions,
    PubsubUnsubscribe
} from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        subscribeToNode(jid: string, opts: string | PubsubSubscribe): Promise<IQ>;
        unsubscribeFromNode(jid: string, opts: string | PubsubUnsubscribe): Promise<IQ>;
        publish<T extends PubsubItemContent = PubsubItemContent>(
            jid: string,
            node: string,
            item: T,
            id?: string
        ): Promise<IQ>;
        getItem(jid: string, node: string, id: string): Promise<IQ>;
        getItems(jid: string, node: string, opts: Paging): Promise<IQ>;
        retract(jid: string, node: string, id: string, notify: boolean): Promise<IQ>;
        purgeNode(jid: string, node: string): Promise<IQ>;
        deleteNode(jid: string, node: string): Promise<IQ>;
        createNode(jid: string, node: string, config?: DataForm): Promise<IQ>;
        getSubscriptions(jid: string, opts?: PubsubSubscriptions): Promise<IQ>;
        getAffiliations(jid: string, node?: string): Promise<IQ>;
        getNodeSubscribers(
            jid: string,
            node: string | PubsubSubscriptions,
            opts?: PubsubSubscriptions
        ): Promise<IQ>;
        updateNodeSubscriptions(
            jid: string,
            node: string,
            delta: PubsubSubscription[]
        ): Promise<IQ>;
        getNodeAffiliations(jid: string, node: string): Promise<IQ>;
        updateNodeAffiliations(jid: string, node: string, items: PubsubAffiliation[]): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(`${NS_SHIM}#SubID`, NS_SHIM);

    client.on('message', (msg: Message) => {
        if (!msg.pubsub) {
            return;
        }
        client.emit('pubsub:event', msg);

        switch (msg.pubsub.eventType) {
            case 'items':
                if (msg.pubsub.items && msg.pubsub.items.published) {
                    client.emit('pubsub:published', msg);
                }
                if (msg.pubsub.items && msg.pubsub.items.retracted) {
                    client.emit('pubsub:retracted', msg);
                }
                break;
            case 'purge':
                client.emit('pubsub:purged', msg);
                break;
            case 'delete':
                client.emit('pubsub:deleted', msg);
                break;
            case 'subscription':
                client.emit('pubsub:subscription', msg);
                break;
            case 'configuration':
                client.emit('pubsub:config', msg);
                break;
        }

        /*
        TODO
        if (msg.pubsub && msg.pubsub.affiliations) {
            client.emit('pubsub:affiliation', msg);
        }
        */
    });

    client.subscribeToNode = (jid: string, opts: string | PubsubSubscribe) => {
        if (typeof opts === 'string') {
            opts = {
                node: opts
            };
        }
        opts.jid = opts.jid || client.jid.full;

        return client.sendIQ({
            pubsub: {
                context: 'user',
                subscribe: opts
            },
            to: jid,
            type: 'set'
        });
    };

    client.unsubscribeFromNode = (jid: string, opts: string | PubsubUnsubscribe) => {
        if (typeof opts === 'string') {
            opts = {
                node: opts
            };
        }
        opts.jid = opts.jid || client.jid.full;

        return client.sendIQ({
            pubsub: {
                context: 'user',
                unsubscribe: opts
            },
            to: jid,
            type: 'set'
        });
    };

    client.publish = <T extends PubsubItemContent = PubsubItemContent>(
        jid: string,
        node: string,
        item: T,
        id?: string
    ) => {
        return client.sendIQ({
            pubsub: {
                context: 'user',
                publish: {
                    item: {
                        content: item,
                        id
                    },
                    node
                }
            },
            to: jid,
            type: 'set'
        });
    };

    client.getItem = (jid: string, node: string, id: string) => {
        return client.sendIQ({
            pubsub: {
                context: 'user',
                fetch: {
                    items: [{ id }],
                    node
                }
            },
            to: jid,
            type: 'get'
        });
    };

    client.getItems = (jid: string, node: string, opts: Paging) => {
        return client.sendIQ({
            pubsub: {
                context: 'user',
                fetch: {
                    max: opts.max,
                    node
                },
                paging: opts
            },
            to: jid,
            type: 'get'
        });
    };

    client.retract = (jid: string, node: string, id: string, notify: boolean) => {
        return client.sendIQ({
            pubsub: {
                context: 'user',
                retract: {
                    id,
                    node,
                    notify
                }
            },
            to: jid,
            type: 'set'
        });
    };

    client.purgeNode = (jid: string, node: string) => {
        return client.sendIQ({
            pubsub: {
                context: 'owner',
                purge: node
            },
            to: jid,
            type: 'set'
        });
    };

    client.deleteNode = (jid: string, node: string) => {
        return client.sendIQ({
            pubsub: {
                context: 'owner',
                destroy: {
                    node
                }
            },
            to: jid,
            type: 'set'
        });
    };

    client.createNode = (jid: string, node: string, config?: DataForm) => {
        return client.sendIQ({
            pubsub: {
                configure: !!config
                    ? {
                          form: config
                      }
                    : undefined,
                context: 'user',
                create: {
                    node
                }
            },
            to: jid,
            type: 'set'
        });
    };

    client.getSubscriptions = (jid: string, opts: PubsubSubscriptions = {}) => {
        return client.sendIQ({
            pubsub: {
                subscriptions: opts
            },
            to: jid,
            type: 'get'
        });
    };

    client.getAffiliations = (jid: string, node?: string) => {
        return client.sendIQ({
            pubsub: {
                affiliations: {
                    node
                }
            },
            to: jid,
            type: 'get'
        });
    };

    client.getNodeSubscribers = (
        jid: string,
        node: string | PubsubSubscriptions,
        opts: PubsubSubscriptions = {}
    ) => {
        if (typeof node === 'string') {
            opts.node = node;
        } else {
            opts = {
                ...opts,
                ...node
            };
        }
        return client.sendIQ({
            pubsub: {
                context: 'owner',
                subscriptions: opts
            },
            to: jid,
            type: 'get'
        });
    };

    client.updateNodeSubscriptions = (jid: string, node: string, delta: PubsubSubscription[]) => {
        return client.sendIQ({
            pubsub: {
                context: 'owner',
                subscriptions: {
                    items: delta,
                    node
                }
            },
            to: jid,
            type: 'set'
        });
    };

    client.getNodeAffiliations = (jid: string, node: string) => {
        return client.sendIQ({
            pubsub: {
                affiliations: {
                    node
                },
                context: 'owner'
            },
            to: jid,
            type: 'get'
        });
    };

    client.updateNodeAffiliations = (jid: string, node: string, items: PubsubAffiliation[]) => {
        return client.sendIQ({
            pubsub: {
                affiliations: {
                    items,
                    node
                },
                context: 'owner'
            },
            to: jid,
            type: 'set'
        });
    };
}
