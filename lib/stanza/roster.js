'use strict';

var NS = 'jabber:iq:roster';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Roster = stanza.define({
        name: 'roster',
        namespace: NS,
        element: 'query',
        fields: {
            ver: {
                get: function () {
                    return types.getAttribute(this.xml, 'ver');
                },
                set: function (value) {
                    var force = (value === '');
                    types.setAttribute(this.xml, 'ver', value, force);
                }
            }
        }
    });
    
    var RosterItem = stanza.define({
        name: '_rosterItem',
        namespace: NS,
        element: 'item',
        fields: {
            jid: types.jidAttribute('jid', true),
            name: types.attribute('name'),
            subscription: types.attribute('subscription', 'none'),
            subscriptionRequested: {
                get: function () {
                    var ask = types.getAttribute(this.xml, 'ask');
                    return ask === 'subscribe';
                }
            },
            preApproved: types.boolAttribute(NS, 'approved'),
            groups: types.multiTextSub(NS, 'group')
        }
    });
    
    
    stanza.extend(Roster, RosterItem, 'items');
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Roster);
    });
};
