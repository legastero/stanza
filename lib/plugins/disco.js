var stanzas = require('../stanza/disco');


function Disco(client) {
    this.client = client;

    this.features = {};
    this.identities = {};
    this.items = {};
}

Disco.prototype = {
    constructor: {
        value: Disco
    },
    addFeature: function (node, feature) {
        node = node || ''; 
        if (!this.features[node]) {
            this.features[node] = [];
        }
        this.features[node].push(feature);
    },
    addIdentity: function (node, identity) {
        node = node || ''; 
        if (!this.identities[node]) {
            this.identities[node] = [];
        }
        this.identities[node].push(identity);
    },
    addItem: function (node, item) {
        node = node || ''; 
        if (!this.items[node]) {
            this.items[node] = [];
        }
        this.items[node].push(item);
    },
    getInfo: function (jid, node, cb) {
        this.client.sendIq({
            to: jid,
            type: 'get',
            discoInfo: {
                node: node
            }
        }, cb);
    },
    getItems: function (jid, node, cb) {
        this.client.sendIq({
            to: jid,
            type: 'get',
            discoItems: {
                node: node
            }
        }, cb);
    }
};

exports.init = function (client) {
    client.disco = new Disco(client);

    client.disco.addFeature('', 'http://jabber.org/protocol/disco#info');
    client.disco.addIdentity('', {
        category: 'client',
        type: 'web'
    });

    client.on('iq:get:discoInfo', function (iq) {
        var node = iq.discoInfo.node;
        client.sendIq(iq.resultReply({
            discoInfo: {
                node: node,
                identities: client.disco.identities[node] || [],
                features: client.disco.features[node] || []
            }
        }));
    });

    client.on('iq:get:discoItems', function (iq) {
        var node = iq.discoInfo.node;
        client.sendIq(iq.resultReply({
            discoItems: {
                node: node,
                items: client.disco.items[node] || []
            }
        }));
    });
};
