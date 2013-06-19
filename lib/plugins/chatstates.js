var stanzas = require('../stanza/chatstates');


module.exports = function (client) {
    client.disco.addFeature('', 'http://jabber.org/protocol/chatstates');
};
