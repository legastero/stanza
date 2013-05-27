var stanzas = require('../stanza/chatstates');


exports.init = function (client) {
    client.disco.addFeature('', 'http://jabber.org/protocol/chatstates');
};
