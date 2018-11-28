import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Pubsub = JXT.define({
        element: 'pubsub',
        fields: {
            create: {
                get: function() {
                    const node = Utils.getSubAttribute(this.xml, NS.PUBSUB, 'create', 'node');
                    if (node) {
                        return node;
                    }
                    return Utils.getBoolSub(this.xml, NS.PUBSUB, 'create');
                },
                set: function(value) {
                    if (value === true || !value) {
                        Utils.setBoolSub(this.xml, NS.PUBSUB, 'create', value);
                    } else {
                        Utils.setSubAttribute(this.xml, NS.PUBSUB, 'create', 'node', value);
                    }
                }
            },
            publishOptions: {
                get: function() {
                    const DataForm = JXT.getDefinition('x', NS.DATAFORM);
                    const conf = Utils.find(this.xml, NS.PUBSUB, 'publish-options');
                    if (conf.length && conf[0].childNodes.length) {
                        return new DataForm({}, conf[0].childNodes[0]);
                    }
                },
                set: function(value) {
                    const DataForm = JXT.getDefinition('x', NS.DATAFORM);
                    const conf = Utils.findOrCreate(this.xml, NS.PUBSUB, 'publish-options');
                    if (value) {
                        const form = new DataForm(value);
                        conf.appendChild(form.xml);
                    }
                }
            }
        },
        name: 'pubsub',
        namespace: NS.PUBSUB
    });

    const Configure = JXT.define({
        element: 'configure',
        name: 'config',
        namespace: NS.PUBSUB
    });

    const Subscribe = JXT.define({
        element: 'subscribe',
        fields: {
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node')
        },
        name: 'subscribe',
        namespace: NS.PUBSUB
    });

    const Subscription = JXT.define({
        element: 'subscription',
        fields: {
            configurable: Utils.boolSub('subscribe-options'),
            configurationRequired: {
                get: function() {
                    const options = Utils.find(this.xml, NS.PUBSUB, 'subscribe-options');

                    if (options.length) {
                        return Utils.getBoolSub(options[0], NS.PUBSUB, 'required');
                    }

                    return false;
                }
            },
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node'),
            subid: Utils.attribute('subid'),
            type: Utils.attribute('subscription')
        },
        name: 'subscription',
        namespace: NS.PUBSUB
    });

    const Subscriptions = JXT.define({
        element: 'subscriptions',
        fields: {
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node')
        },
        name: 'subscriptions',
        namespace: NS.PUBSUB
    });

    const Affiliation = JXT.define({
        element: 'affiliation',
        fields: {
            node: Utils.attribute('node'),
            type: Utils.attribute('affiliation')
        },
        name: 'affiliation',
        namespace: NS.PUBSUB
    });

    const Affiliations = JXT.define({
        element: 'affiliations',
        fields: {
            node: Utils.attribute('node')
        },
        name: 'affiliations',
        namespace: NS.PUBSUB
    });

    const SubscriptionOptions = JXT.define({
        element: 'options',
        fields: {
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node'),
            subid: Utils.attribute('subid')
        },
        name: 'subscriptionOptions',
        namespace: NS.PUBSUB
    });

    const Unsubscribe = JXT.define({
        element: 'unsubscribe',
        fields: {
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node'),
            subid: Utils.attribute('subid')
        },
        name: 'unsubscribe',
        namespace: NS.PUBSUB
    });

    const Publish = JXT.define({
        element: 'publish',
        fields: {
            node: Utils.attribute('node')
        },
        name: 'publish',
        namespace: NS.PUBSUB
    });

    const Retract = JXT.define({
        element: 'retract',
        fields: {
            id: Utils.subAttribute(NS.PUBSUB, 'item', 'id'),
            node: Utils.attribute('node'),
            notify: Utils.boolAttribute('notify')
        },
        name: 'retract',
        namespace: NS.PUBSUB
    });

    const Retrieve = JXT.define({
        element: 'items',
        fields: {
            max: Utils.attribute('max_items'),
            node: Utils.attribute('node')
        },
        name: 'retrieve',
        namespace: NS.PUBSUB
    });

    const Item = JXT.define({
        element: 'item',
        fields: {
            id: Utils.attribute('id'),
            publisher: Utils.jidAttribute('publisher')
        },
        name: 'item',
        namespace: NS.PUBSUB
    });

    JXT.extend(Pubsub, Configure);
    JXT.extend(Pubsub, Subscribe);
    JXT.extend(Pubsub, Unsubscribe);
    JXT.extend(Pubsub, Publish);
    JXT.extend(Pubsub, Retract);
    JXT.extend(Pubsub, Retrieve);
    JXT.extend(Pubsub, Subscription);
    JXT.extend(Pubsub, SubscriptionOptions);
    JXT.extend(Pubsub, Subscriptions);
    JXT.extend(Pubsub, Affiliations);

    JXT.extend(Publish, Item, 'items');
    JXT.extend(Retrieve, Item, 'items');

    JXT.extend(Subscriptions, Subscription, 'list');
    JXT.extend(Affiliations, Affiliation, 'list');

    JXT.extendIQ(Pubsub);

    JXT.withDataForm(function(DataForm) {
        JXT.extend(SubscriptionOptions, DataForm);
        JXT.extend(Item, DataForm);
        JXT.extend(Configure, DataForm);
    });

    JXT.withDefinition('set', NS.RSM, function(RSM) {
        JXT.extend(Pubsub, RSM);
    });
}
