import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Roster = JXT.define({
        element: 'query',
        fields: {
            ver: {
                get: function() {
                    return Utils.getAttribute(this.xml, 'ver');
                },
                set: function(value) {
                    const force = value === '';
                    Utils.setAttribute(this.xml, 'ver', value, force);
                }
            }
        },
        name: 'roster',
        namespace: NS.ROSTER
    });

    const RosterItem = JXT.define({
        element: 'item',
        fields: {
            groups: Utils.multiTextSub(NS.ROSTER, 'group'),
            jid: Utils.jidAttribute('jid', true),
            name: Utils.attribute('name'),
            preApproved: Utils.boolAttribute(NS.ROSTER, 'approved'),
            subscription: Utils.attribute('subscription', 'none'),
            subscriptionRequested: {
                get: function() {
                    const ask = Utils.getAttribute(this.xml, 'ask');
                    return ask === 'subscribe';
                }
            }
        },
        name: '_rosterItem',
        namespace: NS.ROSTER
    });

    JXT.extend(Roster, RosterItem, 'items');

    JXT.extendIQ(Roster);
}
