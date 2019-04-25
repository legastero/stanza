import * as hashes from '../lib/crypto';
import { Namespaces } from '../protocol';
import { JID } from '../protocol/jid';
import { octetCompare } from '../Utils';

function generateVerString(info, hash) {
    let S = '';

    let features = info.features || [];
    let identities = [];
    const extensions = info.extensions || [];

    const formTypes = {};
    const formOrder = [];

    for (const identity of info.identities || []) {
        identities.push(
            [
                identity.category || '',
                identity.type || '',
                identity.lang || '',
                identity.name || ''
            ].join('/')
        );
    }

    const idLen = identities.length;
    const featureLen = features.length;

    identities = [...new Set(identities)].sort(octetCompare);
    features = [...new Set(features)].sort(octetCompare);

    if (featureLen !== features.length || idLen !== identities.length) {
        return false;
    }

    S += identities.join('<') + '<';
    S += features.join('<') + '<';

    let illFormed = false;
    for (const ext of extensions) {
        const fields = ext.fields;
        for (let i = 0, len = fields.length; i < len; i++) {
            if (fields[i].name === 'FORM_TYPE' && fields[i].type === 'hidden') {
                const name = fields[i].value;
                if (formTypes[name]) {
                    illFormed = true;
                    return;
                }
                formTypes[name] = ext;
                formOrder.push(name);
                return;
            }
        }
    }
    if (illFormed) {
        return false;
    }

    formOrder.sort(octetCompare);

    for (const name of formOrder) {
        const ext = formTypes[name];
        const fields = {};
        const fieldOrder = [];

        S += '<' + name;

        for (const field of ext.fields) {
            const fieldName = field.name;
            if (fieldName !== 'FORM_TYPE') {
                let values = field.value || '';
                if (typeof values !== 'object') {
                    values = values.split('\n');
                }
                fields[fieldName] = values.sort(octetCompare);
                fieldOrder.push(fieldName);
            }
        }

        fieldOrder.sort(octetCompare);

        for (const fieldName of fieldOrder) {
            S += '<' + fieldName;
            for (const val of fields[fieldName]) {
                S += '<' + val;
            }
        }
    }

    let ver = hashes
        .createHash(hash)
        .update(Buffer.from(S, 'utf8'))
        .digest('base64');
    let padding = 4 - (ver.length % 4);
    if (padding === 4) {
        padding = 0;
    }

    for (let i = 0; i < padding; i++) {
        ver += '=';
    }
    return ver;
}

function verifyVerString(info, hash, check) {
    const computed = generateVerString(info, hash);
    return computed && computed === check;
}

class Disco {
    constructor() {
        this.features = {};
        this.identities = {};
        this.extensions = {};
        this.items = {};
        this.caps = {};
    }

    addFeature(feature, node) {
        node = node || '';
        if (!this.features[node]) {
            this.features[node] = [];
        }
        this.features[node].push(feature);
    }

    addIdentity(identity, node) {
        node = node || '';
        if (!this.identities[node]) {
            this.identities[node] = [];
        }
        this.identities[node].push(identity);
    }

    addItem(item, node) {
        node = node || '';
        if (!this.items[node]) {
            this.items[node] = [];
        }
        this.items[node].push(item);
    }

    addExtension(form, node) {
        node = node || '';
        if (!this.extensions[node]) {
            this.extensions[node] = [];
        }
        this.extensions[node].push(form);
    }
}

export default function(client) {
    client.disco = new Disco(client);

    client.disco.addFeature(Namespaces.DISCO_INFO);
    client.disco.addFeature(Namespaces.DISCO_ITEMS);
    client.disco.addIdentity({
        category: 'client',
        type: 'web'
    });

    client.registerFeature('caps', 100, function(features, cb) {
        this.emit('disco:caps', {
            caps: features.caps,
            from: new JID(client.jid.domain || client.config.server)
        });
        this.features.negotiated.caps = true;
        cb();
    });

    client.getDiscoInfo = function(jid, node, cb) {
        return this.sendIq(
            {
                discoInfo: {
                    node: node
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.getDiscoItems = function(jid, node, cb) {
        return this.sendIq(
            {
                discoItems: {
                    node: node
                },
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.updateCaps = function() {
        let node = this.config.capsNode || 'https://stanzajs.org';
        const data = JSON.parse(
            JSON.stringify({
                extensions: this.disco.extensions[''],
                features: this.disco.features[''],
                identities: this.disco.identities['']
            })
        );

        const ver = generateVerString(data, 'sha-1');

        this.disco.caps = {
            hash: 'sha-1',
            node: node,
            ver: ver
        };

        node = node + '#' + ver;
        this.disco.features[node] = data.features;
        this.disco.identities[node] = data.identities;
        this.disco.extensions[node] = data.extensions;

        return client.getCurrentCaps();
    };

    client.getCurrentCaps = function() {
        const caps = client.disco.caps;
        if (!caps.ver) {
            return { ver: null, discoInfo: null };
        }

        const node = caps.node + '#' + caps.ver;
        return {
            discoInfo: {
                extensions: client.disco.extensions[node],
                features: client.disco.features[node],
                identities: client.disco.identities[node]
            },
            ver: caps.ver
        };
    };

    client.on('presence', function(pres) {
        if (pres.caps) {
            client.emit('disco:caps', pres);
        }
    });

    client.on('iq:get:discoInfo', function(iq) {
        let node = iq.discoInfo.node || '';
        let reportedNode = iq.discoInfo.node || '';

        if (node === client.disco.caps.node + '#' + client.disco.caps.ver) {
            reportedNode = node;
            node = '';
        }

        client.sendIq(
            iq.resultReply({
                discoInfo: {
                    extensions: client.disco.extensions[node] || [],
                    features: client.disco.features[node] || [],
                    identities: client.disco.identities[node] || [],
                    node: reportedNode
                }
            })
        );
    });

    client.on('iq:get:discoItems', function(iq) {
        const node = iq.discoItems.node;
        client.sendIq(
            iq.resultReply({
                discoItems: {
                    items: client.disco.items[node] || [],
                    node: node
                }
            })
        );
    });

    client.verifyVerString = verifyVerString;
    client.generateVerString = generateVerString;

    // Ensure we always have some caps data
    client.updateCaps();
}
