'use strict';

var NS = 'http://jabber.org/protocol/pubsub';


module.exports = function (stanza) {
    var types = stanza.utils;


    var Pubsub = stanza.define({
        name: 'pubsub',
        namespace: 'http://jabber.org/protocol/pubsub',
        element: 'pubsub',
        fields: {
            publishOptions: {
                get: function () {
                    var DataForm = stanza.getDefinition('x', 'jabber:x:data');
                    var conf = types.find(this.xml, this._NS, 'publish-options');
                    if (conf.length && conf[0].childNodes.length) {
                        return new DataForm({}, conf[0].childNodes[0]);
                    }
                },
                set: function (value) {
                    var DataForm = stanza.getDefinition('x', 'jabber:x:data');
                    var conf = types.findOrCreate(this.xml, this._NS, 'publish-options');
                    if (value) {
                        var form = new DataForm(value);
                        conf.appendChild(form.xml);
                    }
                }
            }
        }
    });
    
    var Subscribe = stanza.define({
        name: 'subscribe',
        namespace: NS,
        element: 'subscribe',
        fields: {
            node: types.attribute('node'),
            jid: types.jidAttribute('jid')
        }
    });
    
    var Subscription = stanza.define({
        name: 'subscription',
        namespace: NS,
        element: 'subscription',
        fields: {
            node: types.attribute('node'),
            jid: types.jidAttribute('jid'),
            subid: types.attribute('subid'),
            type: types.attribute('subscription'),
            configurable: types.boolSub('subscribe-options'),
            configurationRequired: {
                get: function () {
                    var options = types.find(this.xml, NS, 'subscribe-options');
                    if (options.length) {
                        return types.getBoolSub(options[0], NS, 'required');
                    }
                    return false;
                }
            }
        }
    });

    var Subscriptions = stanza.define({
        name: 'subscriptions',
        namespace: NS,
        element: 'subscriptions',
        fields: {
            node: types.attribute('node'),
            jid: types.jidAttribute('jid')
        }
    });
    
    var Affiliation = stanza.define({
        name: 'affiliation',
        namespace: NS,
        element: 'affiliation',
        fields: {
            node: types.attribute('node'),
            jid: types.jidAttribute('jid'),
            type: types.attribute('affiliation')
        }
    });
    
    var Affiliations = stanza.define({
        name: 'affiliations',
        namespace: NS,
        element: 'affiliations',
        fields: {
            node: types.attribute('node'),
            jid: types.jidAttribute('jid')
        }
    });

    var SubscriptionOptions = stanza.define({
        name: 'subscriptionOptions',
        namespace: NS,
        element: 'options',
        fields: {
            node: types.attribute('node'),
            jid: types.jidAttribute('jid'),
            subid: types.attribute('subid')
        }
    });
    
    var Unsubscribe = stanza.define({
        name: 'unsubscribe',
        namespace: NS,
        element: 'unsubscribe',
        fields: {
            node: types.attribute('node'),
            jid: types.jidAttribute('jid')
        }
    });
    
    var Publish = stanza.define({
        name: 'publish',
        namespace: NS,
        element: 'publish',
        fields: {
            node: types.attribute('node'),
        }
    });
    
    var Retract = stanza.define({
        name: 'retract',
        namespace: NS,
        element: 'retract',
        fields: {
            node: types.attribute('node'),
            notify: types.boolAttribute('notify'),
            id: types.subAttribute(NS, 'item', 'id')
        }
    });
    
    var Retrieve = stanza.define({
        name: 'retrieve',
        namespace: NS,
        element: 'items',
        fields: {
            node: types.attribute('node'),
            max: types.attribute('max_items')
        }
    });
    
    var Item = stanza.define({
        name: 'item',
        namespace: NS,
        element: 'item',
        fields: {
            id: types.attribute('id')
        }
    });
    
    
    stanza.extend(Pubsub, Subscribe);
    stanza.extend(Pubsub, Unsubscribe);
    stanza.extend(Pubsub, Publish);
    stanza.extend(Pubsub, Retract);
    stanza.extend(Pubsub, Retrieve);
    stanza.extend(Pubsub, Subscription);
    stanza.extend(Pubsub, SubscriptionOptions);
    stanza.extend(Pubsub, Subscriptions);
    stanza.extend(Pubsub, Affiliations);
   
    stanza.extend(Publish, Item, 'items');
    stanza.extend(Retrieve, Item, 'items');
    
    stanza.extend(Subscriptions, Subscription, 'list');
    stanza.extend(Affiliations, Affiliation, 'list');

    stanza.withDataForm(function (DataForm) {
        stanza.extend(SubscriptionOptions, DataForm);
        stanza.extend(Item, DataForm);
    });
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Pubsub);
    });

    stanza.withDefinition('set', 'http://jabber.org/protocol/rsm', function (RSM) {
        stanza.extend(Pubsub, RSM);
    });
};
