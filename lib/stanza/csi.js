'use strict';

var NS = 'urn:xmpp:csi';


module.exports = function (stanza) {
    var CSIFeature = stanza.define({
        name: 'clientStateIndication',
        namespace: NS,
        element: 'csi'
    });
    
    stanza.define({
        name: 'csiActive',
        eventName: 'csi:active',
        namespace: NS,
        element: 'active',
        topLevel: true
    });
    
    stanza.define({
        name: 'csiInactive',
        eventName: 'csi:inactive',
        namespace: NS,
        element: 'inactive',
        topLevel: true
    });
    
    
    stanza.withStreamFeatures(function (StreamFeatures) {
        stanza.extend(StreamFeatures, CSIFeature);
    });
};
