var stanzas = require('../stanza/carbons');


exports.init = function (client) {
    client.disco.addFeature('', 'urn:xmpp:carbons:2');

    client.carbons = {
        enable: function (cb) {
            client.sendIq({
                type: 'set',
                enableCarbons: true
            }, cb);
        },
        disable: function (cb) {
            client.sendIq({
                type: 'set',
                disableCarbons: true
            }, cb);
        }
    };

    client.on('message', function (msg) {
        if (msg._extensions.carbonSent) {
            return client.emit('carbon:sent', msg);
        }
        if (msg._extensions.carbonReceived) {
            return client.emit('carbon:received', msg);
        }
    });
};
