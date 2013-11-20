"use strict";

var stanzas = require('../stanza/private');


module.exports = function (client) {

    client.getPrivateData = function (opts, cb) {
        this.sendIq({
            type: 'get',
            privateStorage: opts
        }, cb);
    };

    client.setPrivateData = function (opts, cb) {
        this.sendIq({
            type: 'set',
            privateStorage: opts
        }, cb);
    };

};
