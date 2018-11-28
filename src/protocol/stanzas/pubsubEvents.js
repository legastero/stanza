import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Event = JXT.define({
        element: 'event',
        name: 'event',
        namespace: NS.PUBSUB_EVENT
    });

    const EventPurge = JXT.define({
        element: 'purge',
        fields: {
            node: Utils.attribute('node')
        },
        name: 'purged',
        namespace: NS.PUBSUB_EVENT
    });

    const EventDelete = JXT.define({
        element: 'delete',
        fields: {
            node: Utils.attribute('node'),
            redirect: Utils.subAttribute(NS.PUBSUB_EVENT, 'redirect', 'uri')
        },
        name: 'deleted',
        namespace: NS.PUBSUB_EVENT
    });

    const EventSubscription = JXT.define({
        element: 'subscription',
        fields: {
            expiry: {
                get: function() {
                    const text = Utils.getAttribute(this.xml, 'expiry');

                    if (text === 'presence') {
                        return text;
                    } else if (text) {
                        return new Date(text);
                    }
                },
                set: function(value) {
                    if (!value) {
                        return;
                    }

                    if (typeof value !== 'string') {
                        value = value.toISOString();
                    }

                    Utils.setAttribute(this.xml, 'expiry', value);
                }
            },
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node'),
            subid: Utils.attribute('subid'),
            type: Utils.attribute('subscription')
        },
        name: 'subscriptionChanged',
        namespace: NS.PUBSUB_EVENT
    });

    const EventConfiguration = JXT.define({
        element: 'configuration',
        fields: {
            node: Utils.attribute('node')
        },
        name: 'configurationChanged',
        namespace: NS.PUBSUB_EVENT
    });

    const EventItems = JXT.define({
        element: 'items',
        fields: {
            node: Utils.attribute('node'),
            retracted: {
                get: function() {
                    const results = [];
                    const retracted = Utils.find(this.xml, NS.PUBSUB_EVENT, 'retract');

                    for (const xml of retracted) {
                        results.push(xml.getAttribute('id'));
                    }

                    return results;
                },
                set: function(value) {
                    const self = this;

                    for (const id of value) {
                        const retracted = Utils.createElement(
                            NS.PUBSUB_EVENT,
                            'retract',
                            NS.PUBSUB_EVENT
                        );
                        retracted.setAttribute('id', id);
                        self.xml.appendChild(retracted);
                    }
                }
            }
        },
        name: 'updated',
        namespace: NS.PUBSUB_EVENT
    });

    const EventItem = JXT.define({
        element: 'item',
        fields: {
            id: Utils.attribute('id'),
            node: Utils.attribute('node'),
            publisher: Utils.jidAttribute('publisher')
        },
        name: '_eventItem',
        namespace: NS.PUBSUB_EVENT
    });

    JXT.extend(EventItems, EventItem, 'published');

    JXT.extend(Event, EventItems);
    JXT.extend(Event, EventSubscription);
    JXT.extend(Event, EventConfiguration);
    JXT.extend(Event, EventDelete);
    JXT.extend(Event, EventPurge);

    JXT.extendMessage(Event);

    JXT.withDataForm(function(DataForm) {
        JXT.extend(EventConfiguration, DataForm);
    });
}
