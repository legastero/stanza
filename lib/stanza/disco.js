'use strict';

var NSInfo = 'http://jabber.org/protocol/disco#info';
var NSItems = 'http://jabber.org/protocol/disco#items';


module.exports = function (stanza) {
    var types = stanza.utils;

    var DiscoInfo = stanza.define({
        name: 'discoInfo',
        namespace: NSInfo,
        element: 'query',
        fields: {
            node: types.attribute('node'),
            features: types.multiSubAttribute(NSInfo, 'feature', 'var')
        }
    });


    var DiscoIdentity = stanza.define({
        name: '_discoIdentity',
        namespace: NSInfo,
        element: 'identity',
        fields: {
            category: types.attribute('category'),
            type: types.attribute('type'),
            name: types.attribute('name'),
            lang: types.langAttribute()
        }
    });


    var DiscoItems = stanza.define({
        name: 'discoItems',
        namespace: NSItems,
        element: 'query',
        fields: {
            node: types.attribute('node'),
        }
    });

    var DiscoItem = stanza.define({
        name: '_discoItem',
        namespace: NSItems,
        element: 'item',
        fields: {
            jid: types.jidAttribute('jid'),
            node: types.attribute('node'),
            name: types.attribute('name')
        }
    });


    stanza.extend(DiscoItems, DiscoItem, 'items');
    stanza.extend(DiscoInfo, DiscoIdentity, 'identities');

    stanza.withIq(function (Iq) {
        stanza.extend(Iq, DiscoInfo);
        stanza.extend(Iq, DiscoItems);
    });

    stanza.withDataForm(function (DataForm) {
        stanza.extend(DiscoInfo, DataForm, 'extensions');
    });

    stanza.withDefinition('set', 'http://jabber.org/protocol/rsm', function (RSM) {
        stanza.extend(DiscoItems, RSM);
    });
};
