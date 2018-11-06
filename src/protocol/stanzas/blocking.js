import * as NS from '../namespaces';
import { JID } from 'xmpp-jid';

export default function(JXT) {
    const Utils = JXT.utils;

    const jidList = {
        get: function() {
            const result = [];
            const items = Utils.find(this.xml, NS.BLOCKING, 'item');
            if (!items.length) {
                return result;
            }

            items.forEach(function(item) {
                result.push(new JID(Utils.getAttribute(item, 'jid', '')));
            });

            return result;
        },
        set: function(values) {
            const self = this;
            values.forEach(function(value) {
                const item = Utils.createElement(NS.BLOCKING, 'item', NS.BLOCKING);
                Utils.setAttribute(item, 'jid', value.toString());
                self.xml.appendChild(item);
            });
        }
    };

    const Block = JXT.define({
        name: 'block',
        namespace: NS.BLOCKING,
        element: 'block',
        fields: {
            jids: jidList
        }
    });

    const Unblock = JXT.define({
        name: 'unblock',
        namespace: NS.BLOCKING,
        element: 'unblock',
        fields: {
            jids: jidList
        }
    });

    const BlockList = JXT.define({
        name: 'blockList',
        namespace: NS.BLOCKING,
        element: 'blocklist',
        fields: {
            jids: jidList
        }
    });

    JXT.extendIQ(Block);
    JXT.extendIQ(Unblock);
    JXT.extendIQ(BlockList);
}
