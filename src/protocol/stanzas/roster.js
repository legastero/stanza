import * as NS from '../namespaces';


export default function (JXT) {

    const Utils = JXT.utils;

    const Roster = JXT.define({
        name: 'roster',
        namespace: NS.ROSTER,
        element: 'query',
        fields: {
            ver: {
                get: function () {

                    return Utils.getAttribute(this.xml, 'ver');
                },
                set: function (value) {

                    const force = (value === '');
                    Utils.setAttribute(this.xml, 'ver', value, force);
                }
            }
        }
    });

    const RosterItem = JXT.define({
        name: '_rosterItem',
        namespace: NS.ROSTER,
        element: 'item',
        fields: {
            jid: Utils.jidAttribute('jid', true),
            name: Utils.attribute('name'),
            subscription: Utils.attribute('subscription', 'none'),
            subscriptionRequested: {
                get: function () {

                    const ask = Utils.getAttribute(this.xml, 'ask');
                    return ask === 'subscribe';
                }
            },
            preApproved: Utils.boolAttribute(NS.ROSTER, 'approved'),
            groups: Utils.multiTextSub(NS.ROSTER, 'group')
        }
    });


    JXT.extend(Roster, RosterItem, 'items');

    JXT.extendIQ(Roster);
}
