'use strict';

var stanza = require('jxt');
var jxtutil = require('jxt-xmpp-types');
var Message = require('./message');
var DataForm = require('./dataforms').DataForm;


var NS = 'http://jabber.org/protocol/pubsub#event';


exports.Event = stanza.define({
    name: 'event',
    namespace: NS,
    element: 'event'
});

exports.EventPurge = stanza.define({
    name: 'purged',
    namespace: NS,
    element: 'purge',
    fields: {
        node: stanza.attribute('node'),
    }
});

exports.EventDelete = stanza.define({
    name: 'deleted',
    namespace: NS,
    element: 'delete',
    fields: {
        node: stanza.attribute('node'),
        redirect: stanza.subAttribute(NS, 'redirect', 'uri')
    }
});

exports.EventSubscription = stanza.define({
    name: 'subscriptionChanged',
    namespace: NS,
    element: 'subscription',
    fields: {
        node: stanza.attribute('node'),
        jid: jxtutil.jidAttribute('jid'),
        type: stanza.attribute('subscription'),
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
    namespace: NS,
    element: 'configuration',
    fields: {
        node: stanza.attribute('node')
    }
});

exports.EventItems = stanza.define({
    name: 'updated',
    namespace: NS,
    element: 'items',
    fields: {
        node: stanza.attribute('node'),
        retracted: {
            get: function () {
                var results = [];
                var retracted = stanza.find(this.xml, this._NS, 'retract');

                retracted.forEach(function (xml) {
                    results.push(xml.getAttribute('id'));
                });
                return results;
            },
            set: function (value) {
                var self = this;
                value.forEach(function (id) {
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
    namespace: NS,
    element: 'item',
    fields: {
        id: stanza.attribute('id'),
        node: stanza.attribute('node'),
        publisher: jxtutil.jidAttribute('publisher')
    }
});


stanza.extend(exports.EventConfiguration, DataForm);

stanza.extend(exports.EventItems, exports.EventItem, 'published');

stanza.extend(exports.Event, exports.EventItems);
stanza.extend(exports.Event, exports.EventSubscription);
stanza.extend(exports.Event, exports.EventConfiguration);
stanza.extend(exports.Event, exports.EventDelete);
stanza.extend(exports.Event, exports.EventPurge);

stanza.extend(Message, exports.Event);
