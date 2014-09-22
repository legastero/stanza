'use strict';


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/private'));

    client.getPrivateData = function (opts, cb) {
        return this.sendIq({
            type: 'get',
            privateStorage: opts
        }, cb);
    };

    client.setPrivateData = function (opts, cb) {
        return this.sendIq({
            type: 'set',
            privateStorage: opts
        }, cb);
    };
};
