'use strict';

var WSConnection = require('../transports/websocket');


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/framing'));

    client.transports.websocket = WSConnection;
};
