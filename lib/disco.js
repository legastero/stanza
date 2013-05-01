var stanzas = require('./stanza/disco'),
    Client = require('./client').Client,
    Set = require('Set');


function Disco(client) {
    this.client = client;

    this.features = {
        '': new Set([
            'http://jabber.org/protocol/disco#info'
        ])
    };
    this.identities = {
        '': new Set([
            {catgory: 'client', type: 'web'}
        ])
    };
    this.items = {
        '': new Set()
    };
}

Disco.prototype = {
    constructor: {
        value: Disco
    },
    addFeature: function (node, feature) {
        node = node || ''; 
        if (!this.features[node]) {
            this.features[node] = new Set();
        }
        this.features[node].add(feature);
    },
    addIdentity: function (node, identity) {
        node = node || ''; 
        if (!this.identities[node]) {
            this.identities[node] = new Set();
        }
        this.identities[node].add(feature);
    },
    addItem: function (node, item) {
        node = node || ''; 
        if (!this.items[node]) {
            this.items[node] = new Set();
        }
        this.items[node].add(feature);
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

    client.on('iq:get:discoInfo', function (iq) {
        var node = iq.discoInfo.node;
        client.sendIq(iq.resultReply({
            discoInfo: {
                node: node,
                identities: client.disco.identities[node],
                features: client.disco.features[node]
            }
        }));
    });

    client.on('iq:get:discoItems', function (iq) {
        var node = iq.discoInfo.node;
        client.sendIq(iq.resultReply({
            discoItems: {
                node: node,
                items: client.disco.items[node]
            }
        }));
    });
};
