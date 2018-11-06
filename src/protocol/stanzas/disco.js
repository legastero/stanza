import * as NS from '../namespaces';


export default function (JXT) {

    const Utils = JXT.utils;


    const DiscoCaps = JXT.define({
        name: 'caps',
        namespace: NS.CAPS,
        element: 'c',
        fields: {
            ver: Utils.attribute('ver'),
            node: Utils.attribute('node'),
            hash: Utils.attribute('hash'),
            ext: Utils.attribute('ext')
        }
    });

    const DiscoInfo = JXT.define({
        name: 'discoInfo',
        namespace: NS.DISCO_INFO,
        element: 'query',
        fields: {
            node: Utils.attribute('node'),
            features: Utils.multiSubAttribute(NS.DISCO_INFO, 'feature', 'var')
        }
    });

    const DiscoIdentity = JXT.define({
        name: '_discoIdentity',
        namespace: NS.DISCO_INFO,
        element: 'identity',
        fields: {
            category: Utils.attribute('category'),
            type: Utils.attribute('type'),
            name: Utils.attribute('name'),
            lang: Utils.langAttribute()
        }
    });

    const DiscoItems = JXT.define({
        name: 'discoItems',
        namespace: NS.DISCO_ITEMS,
        element: 'query',
        fields: {
            node: Utils.attribute('node')
        }
    });

    const DiscoItem = JXT.define({
        name: '_discoItem',
        namespace: NS.DISCO_ITEMS,
        element: 'item',
        fields: {
            jid: Utils.jidAttribute('jid'),
            node: Utils.attribute('node'),
            name: Utils.attribute('name')
        }
    });


    JXT.extend(DiscoItems, DiscoItem, 'items');
    JXT.extend(DiscoInfo, DiscoIdentity, 'identities');

    JXT.extendIQ(DiscoInfo);
    JXT.extendIQ(DiscoItems);
    JXT.extendPresence(DiscoCaps);
    JXT.extendStreamFeatures(DiscoCaps);

    JXT.withDataForm(function (DataForm) {

        JXT.extend(DiscoInfo, DataForm, 'extensions');
    });

    JXT.withDefinition('set', NS.RSM, function (RSM) {

        JXT.extend(DiscoItems, RSM);
    });
}
