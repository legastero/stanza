'use strict';

var NS = 'http://jabber.org/protocol/pubsub#owner';


module.exports = function (stanza) {
    var types = stanza.utils;

    var PubsubOwner = stanza.define({
        name: 'pubsubOwner',
        namespace: NS,
        element: 'pubsub',
        fields: {
            create: types.subAttribute(NS, 'create', 'node'),
            purge: types.subAttribute(NS, 'purge', 'node'),
            del: types.subAttribute(NS, 'delete', 'node'),
            redirect: {
                get: function () {
                    var del = types.find(this.xml, this._NS, 'delete');
                    if (del.length) {
                        return types.getSubAttribute(del[0], this._NS, 'redirect', 'uri');
                    }
                    return '';
                },
                set: function (value) {
                    var del = types.findOrCreate(this.xml, this._NS, 'delete');
                    types.setSubAttribute(del, this._NS, 'redirect', 'uri', value);
                }
            }
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
            node: types.attribute('node')
        }
    });
    
    var Affiliation = stanza.define({
        name: 'affiliation',
        namespace: NS,
        element: 'affiliation',
        fields: {
            node: types.attribute('node'),
            type: types.attribute('affiliation')
        }
    });
    
    var Affiliations = stanza.define({
        name: 'affiliations',
        namespace: NS,
        element: 'affiliations',
        fields: {
            node: types.attribute('node')
        }
    });
    
    var Configure = stanza.define({
        name: 'config',
        namespace: NS,
        element: 'configure',
        fields: {
            node: types.attribute('node')
        }
    });
    
    
    stanza.extend(PubsubOwner, Configure);
    stanza.extend(PubsubOwner, Subscriptions);
    stanza.extend(PubsubOwner, Affiliations);
    
    stanza.extend(Subscriptions, Subscription, 'list');
    stanza.extend(Affiliations, Affiliation, 'list');

    stanza.withDataForm(function (DataForm) {
        stanza.extend(Configure, DataForm);
    });
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, PubsubOwner);
    });
};
