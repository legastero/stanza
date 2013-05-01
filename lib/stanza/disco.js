var _ = require('lodash'),
    stanza = require('./stanza'),
    Iq = require('./iq').Iq;


function DiscoInfo(data, xml) {
    return stanza.init(this, xml, data);
}
DiscoInfo.prototype = {
    constructor: {
        value: DiscoInfo
    },
    name: 'discoInfo',
    NS: 'http://jabber.org/protocol/disco#info',
    EL: 'query',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node () {
        return this.xml.getAttribute('node') || '';
    },
    set node (value) {
        this.xml.setAttribute('node', value);
    },
    get identities () {
        var result = [];
        var identities = stanza.find(this.xml, this.NS, 'identity');
        _.each(identities, function (identity) {
            result.push({
                category: identity.getAttribute('category'),
                type: identity.getAttribute('type'),
                lang: identity.getAttributeNS(stanza.XML_NS, 'lang'),
                name: identity.getAttribute('name')
            });
        });
        return result;
    },
    set identities (values) {
    },
    get features () {
        var result = [];
        var features = stanza.find(this.xml, this.NS, 'feature');
        _.each(features, function (feature) {
            result.push(feature.getAttribute('var'));
        });
        return result;
    },
    set features (values) {
    }
};


function DiscoItems(data, xml) {
    return stanza.init(this, xml, data);
}
DiscoItems.prototype = {
    constructor: {
        value: DiscoInfo
    },
    name: 'discoItems',
    NS: 'http://jabber.org/protocol/disco#items',
    EL: 'query',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node () {
        return this.xml.getAttribute('node') || '';
    },
    set node (value) {
        this.xml.setAttribute('node', value);
    },
    get items() {
        var result = [];
        var items = stanza.find(this.xml, this.NS, 'item');
        _.each(items, function (item) {
            result.push({
                jid: item.getAttribute('jid'),
                node: item.getAttribute('node'),
                name: item.getAttribute('name')
            });
        });
        return result;
    },
    set items (values) {
    }
};


stanza.extend(Iq, DiscoInfo);
stanza.extend(Iq, DiscoItems);

exports.DiscoInfo = DiscoInfo;
exports.DiscoItems = DiscoItems;
