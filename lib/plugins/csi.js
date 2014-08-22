'use strict';

var CSI = require('../stanza/csi');


module.exports = function (client) {

    client.features.clientStateIndication = function (features, cb) {
        client.negotiatedFeatures.clientStateIndication = true;
        cb();
    };

    client.markActive = function () {
        if (this.negotiatedFeatures.clientStateIndication) {
            this.send(new CSI.Active());
        }
    };

    client.markInactive = function () {
        if (this.negotiatedFeatures.clientStateIndication) {
            this.send(new CSI.Inactive());
        }
    };
};
