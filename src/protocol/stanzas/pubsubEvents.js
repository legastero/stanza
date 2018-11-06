import * as NS from '../namespaces';


export default function (JXT) {

    const Utils = JXT.utils;

    const Event = JXT.define({
        name: 'event',
        namespace: NS.PUBSUB_EVENT,
        element: 'event'
    });

    const EventPurge = JXT.define({
        name: 'purged',
        namespace: NS.PUBSUB_EVENT,
        element: 'purge',
        fields: {
            node: Utils.attribute('node')
        }
    });

    const EventDelete = JXT.define({
        name: 'deleted',
        namespace: NS.PUBSUB_EVENT,
        element: 'delete',
        fields: {
            node: Utils.attribute('node'),
            redirect: Utils.subAttribute(NS.PUBSUB_EVENT, 'redirect', 'uri')
        }
    });

    const EventSubscription = JXT.define({
        name: 'subscriptionChanged',
        namespace: NS.PUBSUB_EVENT,
        element: 'subscription',
        fields: {
            node: Utils.attribute('node'),
            jid: Utils.jidAttribute('jid'),
            type: Utils.attribute('subscription'),
            subid: Utils.attribute('subid'),
            expiry: {
                get: function () {

                    const text = Utils.getAttribute(this.xml, 'expiry');
                    if (text === 'presence') {
                        return text;
                    } else if (text) {
                        return new Date(text);
                    }
                },
                set: function (value) {

                    if (!value) {
                        return;
                    }

                    if (typeof value !== 'string') {
                        value = value.toISOString();
                    }

                    Utils.setAttribute(this.xml, 'expiry', value);
                }
            }
        }
    });

    const EventConfiguration = JXT.define({
        name: 'configurationChanged',
        namespace: NS.PUBSUB_EVENT,
        element: 'configuration',
        fields: {
            node: Utils.attribute('node')
        }
    });

    const EventItems = JXT.define({
        name: 'updated',
        namespace: NS.PUBSUB_EVENT,
        element: 'items',
        fields: {
            node: Utils.attribute('node'),
            retracted: {
                get: function () {

                    const results = [];
                    const retracted = Utils.find(this.xml, NS.PUBSUB_EVENT, 'retract');

                    retracted.forEach(function (xml) {

                        results.push(xml.getAttribute('id'));
                    });
                    return results;
                },
                set: function (value) {

                    const self = this;
                    value.forEach(function (id) {

                        const retracted = Utils.createElement(NS.PUBSUB_EVENT, 'retract', NS.PUBSUB_EVENT);
                        retracted.setAttribute('id', id);
                        self.xml.appendChild(retracted);
                    });
                }
            }
        }
    });

    const EventItem = JXT.define({
        name: '_eventItem',
        namespace: NS.PUBSUB_EVENT,
        element: 'item',
        fields: {
            id: Utils.attribute('id'),
            node: Utils.attribute('node'),
            publisher: Utils.jidAttribute('publisher')
        }
    });


    JXT.extend(EventItems, EventItem, 'published');

    JXT.extend(Event, EventItems);
    JXT.extend(Event, EventSubscription);
    JXT.extend(Event, EventConfiguration);
    JXT.extend(Event, EventDelete);
    JXT.extend(Event, EventPurge);

    JXT.extendMessage(Event);

    JXT.withDataForm(function (DataForm) {

        JXT.extend(EventConfiguration, DataForm);
    });
}
