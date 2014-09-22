'use strict';

var OldWSConnection = require('../transports/old-websocket');


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/stream'));

    client.transports['old-websocket'] = OldWSConnection;
};
