'use strict';

var stanza = require('jxt');
var util = require('./util');
var Iq = require('./iq');
var RSM = require('./rsm');
var DataForm = require('./dataforms').DataForm;


var NSInfo = 'http://jabber.org/protocol/disco#info';
var NSItems = 'http://jabber.org/protocol/disco#items';



exports.DiscoInfo = stanza.define({
    name: 'discoInfo',
    namespace: NSInfo,
    element: 'query',
    fields: {
        node: stanza.attribute('node'),
        features: stanza.multiSubAttribute(NSInfo, 'feature', 'var')
    }
});


var DiscoIdentity = stanza.define({
    name: '_discoIdentity',
    namespace: NSInfo,
    element: 'identity',
    fields: {
        category: stanza.attribute('category'),
        type: stanza.attribute('type'),
        name: stanza.attribute('name'),
        lang: stanza.langAttribute()
    }
});


exports.DiscoItems = stanza.define({
    name: 'discoItems',
    namespace: NSItems,
    element: 'query',
    fields: {
        node: stanza.attribute('node'),
    }
});

var DiscoItem = stanza.define({
    name: '_discoItem',
    namespace: NSItems,
    element: 'item',
    fields: {
        jid: util.jidAttribute('jid'),
        node: stanza.attribute('node'),
        name: stanza.attribute('name')
    }
});


stanza.extend(Iq, exports.DiscoInfo);
stanza.extend(Iq, exports.DiscoItems);
stanza.extend(exports.DiscoItems, RSM);
stanza.extend(exports.DiscoItems, DiscoItem, 'items');
stanza.extend(exports.DiscoInfo, DiscoIdentity, 'identities');
stanza.extend(exports.DiscoInfo, DataForm, 'extensions');
