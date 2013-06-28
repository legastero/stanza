var _ = require('lodash');
var stanza = require('./stanza');
var Iq = require('./iq');
var RSM = require('./rsm');
var DataForm = require('./dataforms').DataForm;


function DiscoInfo(data, xml) {
    return stanza.init(this, xml, data);
}
DiscoInfo.prototype = {
    constructor: {
        value: DiscoInfo
    },
    _name: 'discoInfo',
    NS: 'http://jabber.org/protocol/disco#info',
    EL: 'query',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return this.xml.getAttribute('node') || '';
    },
    set node(value) {
        if (!value) {
            this.xml.removeAttribute('node');
        } else {
            this.xml.setAttribute('node', value);
        }
    },
    get identities() {
        var result = [];
        var identities = stanza.find(this.xml, this.NS, 'identity');
        _.each(identities, function (identity) {
            result.push({
                category: identity.getAttribute('category'),
                type: identity.getAttribute('type'),
                lang: identity.getAttributeNS(stanza.XML_NS, 'lang'),
                _name: identity.getAttribute('name')
            });
        });
        return result;
    },
    set identities(values) {
        var self = this;

        var existing = stanza.find(this.xml, this.NS, 'identity');
        _.each(existing, function (item) {
            this.xml.removeChild(item);
        });
        _.each(values, function (value) {
            var identity = document.createElementNS(self.NS, 'identity');
            if (value.category) {
                identity.setAttribute('category', value.category);
            }
            if (value.type) {
                identity.setAttribute('type', value.type);
            }
            if (value.name) {
                identity.setAttribute('name', value.name);
            }
            if (value.lang) {
                identity.setAttributeNS(stanza.XML_NS, 'lang', value.lang);
            }
            self.xml.appendChild(identity);
        });

    },
    get features() {
        var result = [];
        var features = stanza.find(this.xml, this.NS, 'feature');
        _.each(features, function (feature) {
            result.push(feature.getAttribute('var'));
        });
        return result;
    },
    set features(values) {
        var self = this;

        var existing = stanza.find(this.xml, this.NS, 'feature');
        _.each(existing, function (item) {
            self.xml.removeChild(item);
        });
        _.each(values, function (value) {
            var feature = document.createElementNS(self.NS, 'feature');
            feature.setAttribute('var', value);
            self.xml.appendChild(feature);
        });
    },
    get extensions() {
        var self = this;
        var result = [];

        var forms = stanza.find(this.xml, DataForm.NS, DataForm.EL);
        _.forEach(forms, function (form) {
            var ext = new DataForm({}, form);
            result.push(ext.toJSON());
        });
    },
    set extensions(value) {
        var self = this;

        var forms = stanza.find(this.xml, DataForm.NS, DataForm.EL);
        _.forEach(forms, function (form) {
            self.xml.removeChild(form);
        });

        _.forEach(value, function (ext) {
            var form = new DataForm(ext);
            self.xml.appendChild(form.xml);
        });
    }
};


function DiscoItems(data, xml) {
    return stanza.init(this, xml, data);
}
DiscoItems.prototype = {
    constructor: {
        value: DiscoInfo
    },
    _name: 'discoItems',
    NS: 'http://jabber.org/protocol/disco#items',
    EL: 'query',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return this.xml.getAttribute('node') || '';
    },
    set node(value) {
        this.xml.setAttribute('node', value);
    },
    get items() {
        var result = [];
        var items = stanza.find(this.xml, this.NS, 'item');
        _.each(items, function (item) {
            result.push({
                jid: item.getAttribute('jid'),
                node: item.getAttribute('node'),
                _name: item.getAttribute('name')
            });
        });
        return result;
    },
    set items(values) {
        var self = this;

        var existing = stanza.find(this.xml, this.NS, 'item');
        _.each(existing, function (item) {
            self.xml.removeChild(item);
        });
        _.each(values, function (value) {
            var item = document.createElementNS(self.NS, 'item');
            if (value.jid) {
                item.setAttribute('jid', value.jid);
            }
            if (value.node) {
                item.setAttribute('node', value.node);
            }
            if (value.name) {
                item.setAttribute('name', value.name);
            }
            self.xml.appendChild(item);
        });
    }
};


stanza.extend(Iq, DiscoInfo);
stanza.extend(Iq, DiscoItems);
stanza.extend(DiscoItems, RSM);

exports.DiscoInfo = DiscoInfo;
exports.DiscoItems = DiscoItems;
