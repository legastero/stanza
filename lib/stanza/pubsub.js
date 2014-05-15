'use strict';

var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var Iq = require('./iq');
var Message = require('./message');
var ErrorStanza = require('./error');
var DataForm = require('./dataforms').DataForm;
var RSM = require('./rsm');


var NS = 'http://jabber.org/protocol/pubsub';
var ERRNS = 'http://jabber.org/protocol/pubsub#errors';
var OwnerNS = 'http://jabber.org/protocol/pubsub#owner';
var EventNS = 'http://jabber.org/protocol/pubsub#event';


var CONDITIONS = [
    'closed-node', 'configuration-required', 'invalid-jid',
    'invalid-options', 'invalid-payload', 'invalid-subid', 'item-forbidden',
    'item-required', 'jid-required', 'max-items-exceeded',
    'max-nodes-exceeded', 'nodeid-required', 'not-in-roster-group',
    'not-subscribed', 'payload-too-big', 'payload-required',
    'pending-subscription', 'presence-subscription-required', 'subid-required',
    'too-many-subscriptions', 'unsupported', 'unsupported-access-model'
];


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

exports.PubsubOwner = stanza.define({
    name: 'pubsubOwner',
    namespace: OwnerNS,
    element: 'pubsub',
    fields: {
        create: stanza.subAttribute(OwnerNS, 'create', 'node'),
        purge: stanza.subAttribute(OwnerNS, 'purge', 'node'),
        del: stanza.subAttribute(OwnerNS, 'delete', 'node'),
        redirect: {
            get: function () {
                var del = stanza.find(this.xml, this._NS, 'delete');
                if (del.length) {
                    return stanza.getSubAttribute(del[0], this._NS, 'redirect', 'uri');
                }
                return '';
            },
            set: function (value) {
                var del = stanza.findOrCreate(this.xml, this._NS, 'delete');
                stanza.setSubAttribute(del, this._NS, 'redirect', 'uri', value);
            }
        }
    }
});

exports.Configure = stanza.define({
    name: 'config',
    namespace: OwnerNS,
    element: 'configure',
    fields: {
        node: stanza.attribute('node')
    }
});

exports.Event = stanza.define({
    name: 'event',
    namespace: EventNS,
    element: 'event'
});

exports.Subscribe = stanza.define({
    name: 'subscribe',
    namespace: NS,
    element: 'subscribe',
    fields: {
        node: stanza.attribute('node'),
        jid: util.jidAttribute('jid')
    }
});

exports.Subscription = stanza.define({
    name: 'subscription',
    namespace: NS,
    element: 'subscription',
    fields: {
        node: stanza.attribute('node'),
        jid: util.jidAttribute('jid'),
        subid: stanza.attribute('subid'),
        type: stanza.attribute('subscription')
    }
});

exports.Unsubscribe = stanza.define({
    name: 'unsubscribe',
    namespace: NS,
    element: 'unsubscribe',
    fields: {
        node: stanza.attribute('node'),
        jid: util.jidAttribute('jid')
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

exports.EventPurge = stanza.define({
    name: 'purged',
    namespace: EventNS,
    element: 'purge',
    fields: {
        node: stanza.attribute('node'),
    }
});

exports.EventDelete = stanza.define({
    name: 'deleted',
    namespace: EventNS,
    element: 'delete',
    fields: {
        node: stanza.attribute('node'),
        redirect: stanza.subAttribute(EventNS, 'redirect', 'uri')
    }
});

exports.EventSubscription = stanza.define({
    name: 'subscriptionChanged',
    namespace: EventNS,
    element: 'subscription',
    fields: {
        node: stanza.attribute('node'),
        jid: util.jidAttribute('jid'),
        subscription: stanza.attribute('subscription'),
        subid: stanza.attribute('subid'),
        expiry: {
            get: function () {
                var text = stanza.getAttribute(this.xml, 'expiry');
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

                stanza.setAttribute(this.xml, 'expiry', value);
            }
        }
    }
});

exports.EventConfiguration = stanza.define({
    name: 'configurationChanged',
    namespace: EventNS,
    element: 'configuration',
    fields: {
        node: stanza.attribute('node')
    }
});

exports.EventItems = stanza.define({
    name: 'updated',
    namespace: EventNS,
    element: 'items',
    fields: {
        node: stanza.attribute('node'),
        retracted: {
            get: function () {
                var results = [];
                var retracted = stanza.find(this.xml, this._NS, 'retract');

                _.forEach(retracted, function (xml) {
                    results.push(xml.getAttribute('id'));
                });
                return results;
            },
            set: function (value) {
                var self = this;
                _.forEach(value, function (id) {
                    var retracted = stanza.createElement(self._NS, 'retract', self._NS);
                    retracted.setAttribute('id', id);
                    this.xml.appendChild(retracted);
                });
            }
        }
    }
});

exports.EventItem = stanza.define({
    name: '_eventItem',
    namespace: EventNS,
    element: 'item',
    fields: {
        id: stanza.attribute('id'),
        node: stanza.attribute('node'),
        publisher: util.jidAttribute('publisher')
    }
});

stanza.add(ErrorStanza, 'pubsubCondition', {
    get: function () {
        var self = this;
        var result = [];
        CONDITIONS.forEach(function (condition) {
            var exists = stanza.find(self.xml, ERRNS, condition);
            if (exists.length) {
                result.push(exists[0].tagName);
            }
        });
        return result[0] || '';
    },
    set: function (value) {
        var self = this;
        CONDITIONS.forEach(function (condition) {
            var exists = stanza.find(self.xml, ERRNS, condition);
            if (exists.length) {
                self.xml.removeChild(exists[0]);
            }
        });

        if (value) {
            var condition = stanza.createElement(ERRNS, value);
            this.xml.appendChild(condition);
        }
    }
});


stanza.extend(exports.Pubsub, exports.Subscribe);
stanza.extend(exports.Pubsub, exports.Unsubscribe);
stanza.extend(exports.Pubsub, exports.Publish);
stanza.extend(exports.Pubsub, exports.Retrieve);
stanza.extend(exports.Pubsub, exports.Subscription);
stanza.extend(exports.PubsubOwner, exports.Configure);
stanza.extend(exports.Publish, exports.Item, 'items');
stanza.extend(exports.Retrieve, exports.Item, 'items');
stanza.extend(exports.Configure, DataForm);
stanza.extend(exports.Pubsub, RSM);
stanza.extend(exports.Event, exports.EventItems);
stanza.extend(exports.Event, exports.EventSubscription);
stanza.extend(exports.Event, exports.EventConfiguration);
stanza.extend(exports.Event, exports.EventDelete);
stanza.extend(exports.Event, exports.EventPurge);
stanza.extend(exports.EventConfiguration, DataForm);
stanza.extend(exports.EventItems, exports.EventItem, 'published');
stanza.extend(Message, exports.Event);
stanza.extend(Iq, exports.Pubsub);
stanza.extend(Iq, exports.PubsubOwner);
