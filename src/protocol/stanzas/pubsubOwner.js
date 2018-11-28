import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const PubsubOwner = JXT.define({
        element: 'pubsub',
        fields: {
            del: Utils.subAttribute(NS.PUBSUB_OWNER, 'delete', 'node'),
            purge: Utils.subAttribute(NS.PUBSUB_OWNER, 'purge', 'node'),
            redirect: {
                get: function() {
                    const del = Utils.find(this.xml, NS.PUBSUB_OWNER, 'delete');

                    if (del.length) {
                        return Utils.getSubAttribute(del[0], NS.PUBSUB_OWNER, 'redirect', 'uri');
                    }

                    return '';
                },
                set: function(value) {
                    const del = Utils.findOrCreate(this.xml, NS.PUBSUB_OWNER, 'delete');
                    Utils.setSubAttribute(del, NS.PUBSUB_OWNER, 'redirect', 'uri', value);
                }
            }
        },
        name: 'pubsubOwner',
        namespace: NS.PUBSUB_OWNER
    });

    const Subscription = JXT.define({
        element: 'subscription',
        fields: {
            configurable: Utils.boolSub('subscribe-options'),
            configurationRequired: {
                get: function() {
                    const options = Utils.find(this.xml, NS.PUBSUB_OWNER, 'subscribe-options');

                    if (options.length) {
                        return Utils.getBoolSub(options[0], NS.PUBSUB_OWNER, 'required');
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
        namespace: NS.PUBSUB_OWNER
    });

    const Subscriptions = JXT.define({
        element: 'subscriptions',
        fields: {
            node: Utils.attribute('node')
        },
        name: 'subscriptions',
        namespace: NS.PUBSUB_OWNER
    });

    const Affiliation = JXT.define({
        element: 'affiliation',
        fields: {
            jid: Utils.jidAttribute('jid'),
            type: Utils.attribute('affiliation')
        },
        name: 'affiliation',
        namespace: NS.PUBSUB_OWNER
    });

    const Affiliations = JXT.define({
        element: 'affiliations',
        fields: {
            node: Utils.attribute('node')
        },
        name: 'affiliations',
        namespace: NS.PUBSUB_OWNER
    });

    const Configure = JXT.define({
        element: 'configure',
        fields: {
            node: Utils.attribute('node')
        },
        name: 'config',
        namespace: NS.PUBSUB_OWNER
    });

    const Default = JXT.define({
        element: 'default',
        name: 'default',
        namespace: NS.PUBSUB_OWNER
    });

    JXT.extend(PubsubOwner, Configure);
    JXT.extend(PubsubOwner, Subscriptions);
    JXT.extend(PubsubOwner, Affiliations);
    JXT.extend(PubsubOwner, Default);

    JXT.extend(Subscriptions, Subscription, 'list');
    JXT.extend(Affiliations, Affiliation, 'list');

    JXT.extendIQ(PubsubOwner);

    JXT.withDataForm(function(DataForm) {
        JXT.extend(Configure, DataForm);
    });
}
