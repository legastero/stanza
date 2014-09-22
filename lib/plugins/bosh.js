'use strict';

var BOSHConnection = require('../transports/bosh');


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/bosh'));

    client.transports.bosh = BOSHConnection;
};
