'use strict';

var NS = 'http://jabber.org/protocol/pubsub#event';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Event = stanza.define({
        name: 'event',
        namespace: NS,
        element: 'event'
    });
    
    var EventPurge = stanza.define({
        name: 'purged',
        namespace: NS,
        element: 'purge',
        fields: {
            node: types.attribute('node'),
        }
    });
    
    var EventDelete = stanza.define({
        name: 'deleted',
        namespace: NS,
        element: 'delete',
        fields: {
            node: types.attribute('node'),
            redirect: types.subAttribute(NS, 'redirect', 'uri')
        }
    });
    
    var EventSubscription = stanza.define({
        name: 'subscriptionChanged',
        namespace: NS,
        element: 'subscription',
        fields: {
            node: types.attribute('node'),
            jid: types.jidAttribute('jid'),
            type: types.attribute('subscription'),
            subid: types.attribute('subid'),
            expiry: {
                get: function () {
                    var text = types.getAttribute(this.xml, 'expiry');
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
    
                    types.setAttribute(this.xml, 'expiry', value);
                }
            }
        }
    });
    
    var EventConfiguration = stanza.define({
        name: 'configurationChanged',
        namespace: NS,
        element: 'configuration',
        fields: {
            node: types.attribute('node')
        }
    });
    
    var EventItems = stanza.define({
        name: 'updated',
        namespace: NS,
        element: 'items',
        fields: {
            node: types.attribute('node'),
            retracted: {
                get: function () {
                    var results = [];
                    var retracted = types.find(this.xml, this._NS, 'retract');
    
                    retracted.forEach(function (xml) {
                        results.push(xml.getAttribute('id'));
                    });
                    return results;
                },
                set: function (value) {
                    var self = this;
                    value.forEach(function (id) {
                        var retracted = types.createElement(self._NS, 'retract', self._NS);
                        retracted.setAttribute('id', id);
                        this.xml.appendChild(retracted);
                    });
                }
            }
        }
    });
    
    var EventItem = stanza.define({
        name: '_eventItem',
        namespace: NS,
        element: 'item',
        fields: {
            id: types.attribute('id'),
            node: types.attribute('node'),
            publisher: types.jidAttribute('publisher')
        }
    });
    
    
    stanza.extend(EventItems, EventItem, 'published');
    
    stanza.extend(Event, EventItems);
    stanza.extend(Event, EventSubscription);
    stanza.extend(Event, EventConfiguration);
    stanza.extend(Event, EventDelete);
    stanza.extend(Event, EventPurge);
    
    stanza.withMessage(function (Message) {
        stanza.extend(Message, Event);
    });

    stanza.withDataForm(function (DataForm) {
        stanza.extend(EventConfiguration, DataForm);
    });
};
