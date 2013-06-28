var stanza = require('jxt');


function SubscriptionPreApprovalFeature(data, xml) {
    return stanza.init(this, xml, data);
}
SubscriptionPreApprovalFeature.prototype = {
    constructor: {
        value: SubscriptionPreApprovalFeature
    },
    _name: 'subscriptionPreApproval',
    NS: 'urn:xmpp:features:pre-approval',
    EL: 'sub',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


module.exports = SubscriptionPreApprovalFeature;
