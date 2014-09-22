'use strict';


module.exports = function (stanza) {
    var StreamFeatures = stanza.define({
        name: 'streamFeatures',
        namespace: 'http://etherx.jabber.org/streams',
        element: 'features',
        topLevel: true
    });
    
    var RosterVerFeature = stanza.define({
        name: 'rosterVersioning',
        namespace: 'urn:xmpp:features:rosterver',
        element: 'ver'
    });
    
    var SubscriptionPreApprovalFeature = stanza.define({
        name: 'subscriptionPreApproval',
        namespace: 'urn:xmpp:features:pre-approval',
        element: 'sub'
    });
    
    
    stanza.extend(StreamFeatures, RosterVerFeature);
    stanza.extend(StreamFeatures, SubscriptionPreApprovalFeature);
};
