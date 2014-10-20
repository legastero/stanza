'use strict';

var stanza = require('jxt');
var jxtutil = require('jxt-xmpp-types');
var Iq = require('./iq');
var DataForm = require('./dataforms').DataForm;


var NS = 'http://jabber.org/protocol/pubsub#owner';


exports.PubsubOwner = stanza.define({
    name: 'pubsubOwner',
    namespace: NS,
    element: 'pubsub',
    fields: {
        create: stanza.subAttribute(NS, 'create', 'node'),
        purge: stanza.subAttribute(NS, 'purge', 'node'),
        del: stanza.subAttribute(NS, 'delete', 'node'),
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
    namespace: NS,
    element: 'configure',
    fields: {
        node: stanza.attribute('node')
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

exports.Subscriptions = stanza.define({
    name: 'subscriptions',
    namespace: NS,
    element: 'subscriptions',
    fields: {
        node: stanza.attribute('node')
    }
});

exports.Affiliation = stanza.define({
    name: 'affiliation',
    namespace: NS,
    element: 'affiliation',
    fields: {
        node: stanza.attribute('node'),
        type: stanza.attribute('affiliation')
    }
});

exports.Affiliations = stanza.define({
    name: 'affiliations',
    namespace: NS,
    element: 'affiliations',
    fields: {
        node: stanza.attribute('node')
    }
});




stanza.extend(exports.Configure, DataForm);
stanza.extend(exports.PubsubOwner, exports.Configure);
stanza.extend(exports.PubsubOwner, exports.Subscriptions);
stanza.extend(exports.PubsubOwner, exports.Affiliations);

stanza.extend(exports.Subscriptions, exports.Subscription, 'list');
stanza.extend(exports.Affiliations, exports.Affiliation, 'list');

stanza.extend(Iq, exports.PubsubOwner);
