var stanza = require('jxt');
var StreamFeatures = require('./streamFeatures');


var NS = 'urn:xmpp:csi';


exports.CSIFeature = stanza.define({
    name: 'clientStateIndication',
    namespace: NS,
    element: 'csi'
});


exports.Active = stanza.define({
    name: 'csiActive',
    eventName: 'csi:active',
    namespace: NS,
    element: 'active',
    topLevel: true
});

exports.Inactive = stanza.define({
    name: 'csiInactive',
    eventName: 'csi:inactive',
    namespace: NS,
    element: 'inactive',
    topLevel: true
});


stanza.extend(StreamFeatures, exports.CSIFeature);
