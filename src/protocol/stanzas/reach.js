import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const ReachURI = JXT.define({
        name: '_reachAddr',
        namespace: NS.REACH_0,
        element: 'addr',
        fields: {
            uri: Utils.attribute('uri'),
            $desc: {
                get: function() {
                    return Utils.getSubLangText(this.xml, NS.REACH_0, 'desc', this.lang);
                }
            },
            desc: {
                get: function() {
                    const descs = this.$desc;
                    return descs[this.lang] || '';
                },
                set: function(value) {
                    Utils.setSubLangText(this.xml, NS.REACH_0, 'desc', value, this.lang);
                }
            }
        }
    });

    const reachability = {
        get: function() {
            const reach = Utils.find(this.xml, NS.REACH_0, 'reach');
            const results = [];
            if (reach.length) {
                const addrs = Utils.find(reach[0], NS.REACH_0, 'addr');
                for (const addr of addrs) {
                    results.push(new ReachURI({}, addr));
                }
            }
            return results;
        },
        set: function(value) {
            const reach = Utils.findOrCreate(this.xml, NS.REACH_0, 'reach');
            Utils.setAttribute(reach, 'xmlns', NS.REACH_0);
            for (const info of value) {
                const addr = new ReachURI(info);
                reach.appendChild(addr.xml);
            }
        }
    };

    JXT.withPubsubItem(function(Item) {
        JXT.add(Item, 'reach', reachability);
    });

    JXT.withPresence(function(Presence) {
        JXT.add(Presence, 'reach', reachability);
    });
}
