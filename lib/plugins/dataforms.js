require('../stanza/dataforms');


module.exports = function (client) {
    client.disco.addFeature('jabber:x:data');

    client.on('message', function (msg) {
        if (msg._extensions.form) {
            client.emit('dataform', msg);
        }
    });
};
