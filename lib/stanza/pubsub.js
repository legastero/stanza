'use strict';

var stanza = require('jxt');
var jxtutil = require('jxt-xmpp-types');
var Iq = require('./iq');
var Message = require('./message');
var DataForm = require('./dataforms').DataForm;
var RSM = require('./rsm');


var NS = 'http://jabber.org/protocol/pubsub';


exports.Pubsub = stanza.define({
    name: 'pubsub',
    namespace: 'http://jabber.org/protocol/pubsub',
    element: 'pubsub',
    fields: {
        publishOptions: {
            get: function () {
                var conf = stanza.find(this.xml, this._NS, 'publish-options');
                if (conf.length && conf[0].childNodes.length) {
                    return new DataForm({}, conf[0].childNodes[0]);
                }
            },
            set: function (value) {
                var conf = stanza.findOrCreate(this.xml, this._NS, 'publish-options');
                if (value) {
                    var form = new DataForm(value);
                    conf.appendChild(form.xml);
                }
            }
        }
    }
});

exports.Subscribe = stanza.define({
    name: 'subscribe',
    namespace: NS,
    element: 'subscribe',
    fields: {
        node: stanza.attribute('node'),
        jid: jxtutil.jidAttribute('jid')
    }
});

exports.Subscription = stanza.define({
    name: 'subscription',
    namespace: NS,
    element: 'subscription',
    fields: {
        node: stanza.attribute('node'),
        jid: jxtutil.jidAttribute('jid'),
        subid: stanza.attribute('subid'),
        type: stanza.attribute('subscription'),
        configurable: stanza.boolSub('subscribe-options'),
        configurationRequired: {
            get: function () {
                var options = stanza.find(this.xml, NS, 'subscribe-options');
                if (options.length) {
                    return stanza.getBoolSub(options[0], NS, 'required');
                }
                return false;
            }
        }
    }
});

exports.SubscriptionOptions = stanza.define({
    name: 'subscriptionOptions',
    namespace: NS,
    element: 'options',
    fields: {
        node: stanza.attribute('node'),
        jid: jxtutil.jidAttribute('jid'),
        subid: stanza.attribute('subid')
    }
});

exports.Unsubscribe = stanza.define({
    name: 'unsubscribe',
    namespace: NS,
    element: 'unsubscribe',
    fields: {
        node: stanza.attribute('node'),
        jid: jxtutil.jidAttribute('jid')
    }
});

exports.Subscriptions = stanza.define({
    name: 'subscriptions',
    namespace: NS,
    element: 'subscriptions',
    fields: {
        node: stanza.attribute('node'),
        jid: jxtutil.jidAttribute('jid')
    }
});

exports.Affiliation = stanza.define({
    name: 'affiliation',
    namespace: NS,
    element: 'affiliation',
    fields: {
        node: stanza.attribute('node'),
        jid: jxtutil.jidAttribute('jid'),
        type: stanza.attribute('affiliation')
    }
});

exports.Affiliations = stanza.define({
    name: 'affiliations',
    namespace: NS,
    element: 'affiliations',
    fields: {
        node: stanza.attribute('node'),
        jid: jxtutil.jidAttribute('jid')
    }
});

exports.Publish = stanza.define({
    name: 'publish',
    namespace: NS,
    element: 'publish',
    fields: {
        node: stanza.attribute('node'),
    }
});

exports.Retract = stanza.define({
    name: 'retract',
    namespace: NS,
    element: 'retract',
    fields: {
        node: stanza.attribute('node'),
        notify: stanza.boolAttribute('notify'),
        id: stanza.subAttribute(NS, 'item', 'id')
    }
});

exports.Retrieve = stanza.define({
    name: 'retrieve',
    namespace: NS,
    element: 'items',
    fields: {
        node: stanza.attribute('node'),
        max: stanza.attribute('max_items')
    }
});

exports.Item = stanza.define({
    name: 'item',
    namespace: NS,
    element: 'item',
    fields: {
        id: stanza.attribute('id')
    }
});


stanza.extend(exports.Pubsub, exports.Subscribe);
stanza.extend(exports.Pubsub, exports.Unsubscribe);
stanza.extend(exports.Pubsub, exports.Publish);
stanza.extend(exports.Pubsub, exports.Retrieve);
stanza.extend(exports.Pubsub, exports.Subscription);
stanza.extend(exports.Pubsub, exports.SubscriptionOptions);
stanza.extend(exports.Pubsub, exports.Subscriptions);
stanza.extend(exports.Pubsub, exports.Affiliations);
stanza.extend(exports.Pubsub, RSM);

stanza.extend(exports.Publish, exports.Item, 'items');
stanza.extend(exports.Retrieve, exports.Item, 'items');

stanza.extend(exports.SubscriptionOptions, DataForm);

stanza.extend(exports.Subscriptions, exports.Subscription, 'list');
stanza.extend(exports.Affiliations, exports.Affiliation, 'list');

stanza.extend(Iq, exports.Pubsub);
stanza.extend(Message, exports.Pubsub);
