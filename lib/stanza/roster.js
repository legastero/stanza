'use strict';

var stanza = require('jxt');
var util = require('./util');
var Iq = require('./iq');

var NS = 'jabber:iq:roster';


var Roster = module.exports = stanza.define({
    name: 'roster',
    namespace: NS,
    element: 'query',
    fields: {
        ver: {
            get: function () {
                return stanza.getAttribute(this.xml, 'ver');
            },
            set: function (value) {
                var force = (value === '');
                stanza.setAttribute(this.xml, 'ver', value, force);
            }
        }
    }
});

var RosterItem = stanza.define({
    name: '_rosterItem',
    namespace: NS,
    element: 'item',
    fields: {
        jid: util.jidAttribute('jid'),
        name: stanza.attribute('name'),
        subscription: stanza.attribute('subscription', 'none'),
        subscriptionRequested: {
            get: function () {
                var ask = stanza.getAttribute(this.xml, 'ask');
                return ask === 'subscribe';
            }
        },
        preApproved: stanza.boolAttribute(NS, 'approved'),
        groups: stanza.multiSubText(NS, 'group')
    }
});


stanza.extend(Iq, Roster);
stanza.extend(Roster, RosterItem, 'items');
