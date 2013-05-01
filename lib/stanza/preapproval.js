var stanza = require('./stanza');


function SubscriptionPreApprovalFeature(data, xml) {
    return stanza.init(this, xml, data);
}
SubscriptionPreApprovalFeature.prototype = {
    constructor: {
        value: SubscriptionPreApprovalFeature
    },
    name: 'subscriptionPreApproval',
    NS: 'urn:xmpp:features:pre-approval',
    EL: 'sub',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


exports.SubscriptionPreApprovalFeature = SubscriptionPreApprovalFeature;
