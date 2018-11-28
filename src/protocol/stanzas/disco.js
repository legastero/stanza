import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const DiscoCaps = JXT.define({
        element: 'c',
        fields: {
            ext: Utils.attribute('ext'),
            hash: Utils.attribute('hash'),
            node: Utils.attribute('node'),
            ver: Utils.attribute('ver')
        },
        name: 'caps',
        namespace: NS.CAPS
    });

    const DiscoInfo = JXT.define({
        element: 'query',
        fields: {
            features: Utils.multiSubAttribute(NS.DISCO_INFO, 'feature', 'var'),
            node: Utils.attribute('node')
        },
        name: 'discoInfo',
        namespace: NS.DISCO_INFO
    });

    const DiscoIdentity = JXT.define({
        element: 'identity',
        fields: {
            category: Utils.attribute('category'),
            lang: Utils.langAttribute(),
            name: Utils.attribute('name'),
            type: Utils.attribute('type')
        },
        name: '_discoIdentity',
        namespace: NS.DISCO_INFO
    });

    const DiscoItems = JXT.define({
        element: 'query',
        fields: {
            node: Utils.attribute('node')
        },
        name: 'discoItems',
        namespace: NS.DISCO_ITEMS
    });

    const DiscoItem = JXT.define({
        element: 'item',
        fields: {
            jid: Utils.jidAttribute('jid'),
            name: Utils.attribute('name'),
            node: Utils.attribute('node')
        },
        name: '_discoItem',
        namespace: NS.DISCO_ITEMS
    });

    JXT.extend(DiscoItems, DiscoItem, 'items');
    JXT.extend(DiscoInfo, DiscoIdentity, 'identities');

    JXT.extendIQ(DiscoInfo);
    JXT.extendIQ(DiscoItems);
    JXT.extendPresence(DiscoCaps);
    JXT.extendStreamFeatures(DiscoCaps);

    JXT.withDataForm(function(DataForm) {
        JXT.extend(DiscoInfo, DataForm, 'extensions');
    });

    JXT.withDefinition('set', NS.RSM, function(RSM) {
        JXT.extend(DiscoItems, RSM);
    });
}
