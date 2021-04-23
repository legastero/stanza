import { Agent } from '../';
import * as JID from '../JID';
import { NS_SHIM } from '../Namespaces';
import {
    DataForm,
    IQ,
    Paging,
    Pubsub,
    PubsubAffiliation,
    PubsubAffiliations,
    PubsubCreate,
    PubsubEvent,
    PubsubEventConfiguration,
    PubsubEventDelete,
    PubsubEventItems,
    PubsubEventPurge,
    PubsubEventSubscription,
    PubsubFetchResult,
    PubsubItem,
    PubsubItemContent,
    PubsubSubscribe,
    PubsubSubscribeWithOptions,
    PubsubSubscription,
    PubsubSubscriptions,
    PubsubSubscriptionWithOptions,
    PubsubUnsubscribe,
    ReceivedMessage
} from '../protocol';

declare module '../' {
    export interface Agent {
        subscribeToNode(
            jid: string,
            opts: string | PubsubSubscribeWithOptions
        ): Promise<PubsubSubscriptionWithOptions>;
        unsubscribeFromNode(
            jid: string,
            opts: string | PubsubUnsubscribeOptions
        ): Promise<PubsubSubscription>;
        publish<T extends PubsubItemContent = PubsubItemContent>(
            jid: string,
            node: string,
            item: T,
            id?: string
        ): Promise<IQ>;
        getItem<T extends PubsubItemContent = PubsubItemContent>(
            jid: string,
            node: string,
            id: string
        ): Promise<PubsubItem<T>>;
        getItems<T extends PubsubItemContent = PubsubItemContent>(
            jid: string,
            node: string,
            opts?: Paging
        ): Promise<PubsubFetchResult<T>>;
        retract(jid: string, node: string, id: string, notify: boolean): Promise<IQ>;
        purgeNode(jid: string, node: string): Promise<IQ>;
        deleteNode(jid: string, node: string): Promise<IQ>;
        createNode(jid: string, node?: string, config?: DataForm): Promise<PubsubCreate>;
        configureNode(jid: string, node: string, config: DataForm): Promise<IQ>;
        getNodeConfig(jid: string, node: string): Promise<DataForm>;
        getDefaultNodeConfig(jid: string): Promise<DataForm>;
        getDefaultSubscriptionOptions(jid: string): Promise<DataForm>;
        getSubscriptions(jid: string, opts?: PubsubSubscriptions): Promise<PubsubSubscriptions>;
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
        getNodeAffiliations(jid: string, node: string): Promise<PubsubAffiliations>;
        updateNodeAffiliations(jid: string, node: string, items: PubsubAffiliation[]): Promise<IQ>;
    }

    export interface AgentEvents {
        'pubsub:event': PubsubEventMessage;
        'pubsub:published': PubsubPublish;
        'pubsub:retracted': PubsubRetract;
        'pubsub:purged': PubsubEventMessage & { pubsub: PubsubEventPurge };
        'pubsub:deleted': PubsubEventMessage & { pubsub: PubsubEventDelete };
        'pubsub:subscription': PubsubEventMessage & { pubsub: PubsubEventSubscription };
        'pubsub:config': PubsubEventMessage & { pubsub: PubsubEventConfiguration };
        'pubsub:affiliations': PubsubMessage & { pubsub: PubsubAffiliationChange };
    }
}

export interface PubsubSubscribeOptions extends PubsubSubscribeWithOptions {
    useBareJID?: boolean;
}
export interface PubsubUnsubscribeOptions extends PubsubUnsubscribe {
    useBareJID?: boolean;
}

type PubsubMessage = ReceivedMessage & { pubsub: Pubsub };
type PubsubEventMessage = ReceivedMessage & { pubsub: PubsubEvent };
type PubsubPublish = PubsubEventMessage & {
    pubsub: PubsubEventItems & {
        items: {
            published: PubsubItem[];
        };
    };
};
type PubsubRetract = PubsubEventMessage & {
    pubsub: PubsubEventItems & {
        items: {
            retracted: PubsubItem[];
        };
    };
};
type PubsubAffiliationChange = PubsubMessage & {
    pubsub: Pubsub & {
        affiliations: PubsubAffiliations;
    };
};

function isPubsubMessage(msg: ReceivedMessage): msg is PubsubEventMessage {
    return !!msg.pubsub;
}
function isPubsubPublish(msg: PubsubEventMessage): msg is PubsubPublish {
    return !!msg.pubsub.items && !!msg.pubsub.items.published;
}
function isPubsubRetract(msg: PubsubEventMessage): msg is PubsubRetract {
    return !!msg.pubsub.items && !!msg.pubsub.items.retracted;
}
function isPubsubPurge(
    msg: PubsubEventMessage
): msg is PubsubEventMessage & { pubsub: PubsubEventPurge } {
    return msg.pubsub.eventType === 'purge';
}
function isPubsubDelete(
    msg: PubsubEventMessage
): msg is PubsubEventMessage & { pubsub: PubsubEventDelete } {
    return msg.pubsub.eventType === 'delete';
}
function isPubsubSubscription(
    msg: PubsubEventMessage
): msg is PubsubEventMessage & { pubsub: PubsubEventSubscription } {
    return msg.pubsub.eventType === 'subscription';
}
function isPubsubConfiguration(
    msg: PubsubEventMessage
): msg is PubsubEventMessage & { pubsub: PubsubEventConfiguration } {
    return msg.pubsub.eventType === 'configuration';
}
function isPubsubAffiliation(
    msg: ReceivedMessage
): msg is PubsubMessage & { pubsub: PubsubAffiliationChange } {
    if (!msg.pubsub) {
        return false;
    }
    return (!msg.pubsub.context || msg.pubsub.context === 'user') && !!msg.pubsub.affiliations;
}

export default function (client: Agent) {
    client.disco.addFeature(`${NS_SHIM}#SubID`, NS_SHIM);

    client.on('message', msg => {
        if (isPubsubAffiliation(msg)) {
            client.emit('pubsub:affiliations', msg);
            return;
        }

        if (!isPubsubMessage(msg)) {
            return;
        }
        client.emit('pubsub:event', msg);

        if (isPubsubPublish(msg)) {
            client.emit('pubsub:published', msg);
            return;
        }
        if (isPubsubRetract(msg)) {
            client.emit('pubsub:retracted', msg);
            return;
        }
        if (isPubsubPurge(msg)) {
            client.emit('pubsub:purged', msg);
            return;
        }
        if (isPubsubDelete(msg)) {
            client.emit('pubsub:deleted', msg);
            return;
        }
        if (isPubsubSubscription(msg)) {
            client.emit('pubsub:subscription', msg);
            return;
        }
        if (isPubsubConfiguration(msg)) {
            client.emit('pubsub:config', msg);
            return;
        }
    });

    client.subscribeToNode = async (jid: string, opts: string | PubsubSubscribeOptions) => {
        const subscribe: PubsubSubscribe = {};
        let form: DataForm | undefined;
        if (typeof opts === 'string') {
            subscribe.node = opts;
            subscribe.jid = JID.toBare(client.jid);
        } else {
            subscribe.node = opts.node;
            subscribe.jid = opts.jid || (opts.useBareJID ? JID.toBare(client.jid) : client.jid);
            form = opts.options;
        }
        const resp = await client.sendIQ({
            pubsub: {
                context: 'user',
                subscribe,
                subscriptionOptions: form ? { form } : undefined
            },
            to: jid,
            type: 'set'
        });

        const sub: PubsubSubscriptionWithOptions = resp.pubsub.subscription || {};
        if (resp.pubsub.subscriptionOptions) {
            sub.options = resp.pubsub.subscriptionOptions.form;
        }
        return sub;
    };

    client.unsubscribeFromNode = async (jid: string, opts: string | PubsubUnsubscribeOptions) => {
        const unsubscribe: PubsubUnsubscribe = {};
        if (typeof opts === 'string') {
            unsubscribe.node = opts;
            unsubscribe.jid = JID.toBare(client.jid);
        } else {
            unsubscribe.node = opts.node;
            unsubscribe.subid = opts.subid;
            unsubscribe.jid = opts.jid || (opts.useBareJID ? JID.toBare(client.jid) : client.jid);
        }

        const resp = await client.sendIQ({
            pubsub: {
                context: 'user',
                unsubscribe
            },
            to: jid,
            type: 'set'
        });
        if (!resp.pubsub || !resp.pubsub.subscription) {
            return {
                ...unsubscribe,
                state: 'none'
            } as PubsubSubscription;
        }
        return resp.pubsub.subscription;
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

    client.getItem = async <T extends PubsubItemContent>(jid: string, node: string, id: string) => {
        const resp = await client.sendIQ({
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
        return resp.pubsub.fetch.items[0] as PubsubItem<T>;
    };

    client.getItems = async <T extends PubsubItemContent>(
        jid: string,
        node: string,
        opts: Paging = {}
    ) => {
        const resp = await client.sendIQ({
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
        const result = resp.pubsub.fetch as PubsubFetchResult<T>;
        result.paging = resp.pubsub.paging;
        return result;
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

    client.deleteNode = (jid: string, node: string, redirect?: string) => {
        return client.sendIQ({
            pubsub: {
                context: 'owner',
                destroy: {
                    node,
                    redirect
                }
            },
            to: jid,
            type: 'set'
        });
    };

    client.createNode = async (jid: string, node?: string, config?: DataForm) => {
        const resp = await client.sendIQ({
            pubsub: {
                configure: config
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
        if (!resp.pubsub || !resp.pubsub.create) {
            return {
                node
            };
        }
        return resp.pubsub.create;
    };

    client.getSubscriptions = async (jid: string, opts: PubsubSubscriptions = {}) => {
        const resp = await client.sendIQ({
            pubsub: {
                context: 'user',
                subscriptions: opts
            },
            to: jid,
            type: 'get'
        });
        return resp.pubsub.subscriptions;
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

    client.getNodeAffiliations = async (jid: string, node: string) => {
        const resp = await client.sendIQ({
            pubsub: {
                affiliations: {
                    node
                },
                context: 'owner'
            },
            to: jid,
            type: 'get'
        });
        return resp.pubsub.affiliations;
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

    client.getNodeConfig = async (jid: string, node: string) => {
        const resp = await client.sendIQ({
            pubsub: {
                configure: {
                    node
                },
                context: 'owner'
            },
            to: jid,
            type: 'get'
        });
        return resp.pubsub.configure.form || {};
    };

    client.getDefaultNodeConfig = async (jid: string) => {
        const resp = await client.sendIQ({
            pubsub: {
                context: 'owner',
                defaultConfiguration: {}
            },
            to: jid,
            type: 'get'
        });
        return resp.pubsub.defaultConfiguration.form || {};
    };

    client.configureNode = async (jid: string, node: string, config: DataForm) => {
        return client.sendIQ({
            pubsub: {
                configure: {
                    form: config,
                    node
                },
                context: 'owner'
            },
            to: jid,
            type: 'set'
        });
    };

    client.getDefaultSubscriptionOptions = async (jid: string) => {
        const resp = await client.sendIQ({
            pubsub: {
                defaultSubscriptionOptions: {}
            },
            to: jid,
            type: 'get'
        });
        return resp.pubsub.defaultSubscriptionOptions.form || {};
    };
}
