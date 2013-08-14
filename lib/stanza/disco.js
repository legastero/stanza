var _ = require('../../vendor/lodash');
var stanza = require('jxt');
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
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get identities() {
        var result = [];
        var identities = stanza.find(this.xml, this.NS, 'identity');
        identities.forEach(function (identity) {
            result.push({
                category: stanza.getAttribute(identity, 'category'),
                type: stanza.getAttribute(identity, 'type'),
                lang: identity.getAttributeNS(stanza.XML_NS, 'lang'),
                name: stanza.getAttribute(identity, 'name')
            });
        });
        return result;
    },
    set identities(values) {
        var self = this;

        var existing = stanza.find(this.xml, this.NS, 'identity');
        existing.forEach(function (item) {
            self.xml.removeChild(item);
        });
        values.forEach(function (value) {
            var identity = document.createElementNS(self.NS, 'identity');
            stanza.setAttribute(identity, 'category', value.category);
            stanza.setAttribute(identity, 'type', value.type);
            stanza.setAttribute(identity, 'name', value.name);
            if (value.lang) {
                identity.setAttributeNS(stanza.XML_NS, 'lang', value.lang);
            }
            self.xml.appendChild(identity);
        });

    },
    get features() {
        var result = [];
        var features = stanza.find(this.xml, this.NS, 'feature');
        features.forEach(function (feature) {
            result.push(feature.getAttribute('var'));
        });
        return result;
    },
    set features(values) {
        var self = this;

        var existing = stanza.find(this.xml, this.NS, 'feature');
        existing.forEach(function (item) {
            self.xml.removeChild(item);
        });
        values.forEach(function (value) {
            var feature = document.createElementNS(self.NS, 'feature');
            feature.setAttribute('var', value);
            self.xml.appendChild(feature);
        });
    },
    get extensions() {
        var self = this;
        var result = [];

        var forms = stanza.find(this.xml, DataForm.NS, DataForm.EL);
        forms.forEach(function (form) {
            var ext = new DataForm({}, form);
            result.push(ext.toJSON());
        });
    },
    set extensions(value) {
        var self = this;

        var forms = stanza.find(this.xml, DataForm.NS, DataForm.EL);
        forms.forEach(function (form) {
            self.xml.removeChild(form);
        });

        value.forEach(function (ext) {
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
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get items() {
        var result = [];
        var items = stanza.find(this.xml, this.NS, 'item');
        items.forEach(function (item) {
            result.push({
                jid: stanza.getAttribute(item, 'jid'),
                node: stanza.getAttribute(item, 'node'),
                name: stanza.getAttribute(item, 'name')
            });
        });
        return result;
    },
    set items(values) {
        var self = this;

        var existing = stanza.find(this.xml, this.NS, 'item');
        existing.forEach(function (item) {
            self.xml.removeChild(item);
        });
        values.forEach(function (value) {
            var item = document.createElementNS(self.NS, 'item');
            stanza.setAttribute(item, 'jid', value.jid);
            stanza.setAttribute(item, 'node', value.node);
            stanza.setAttribute(item, 'name', value.name);
            self.xml.appendChild(item);
        });
    }
};


stanza.extend(Iq, DiscoInfo);
stanza.extend(Iq, DiscoItems);
stanza.extend(DiscoItems, RSM);

exports.DiscoInfo = DiscoInfo;
exports.DiscoItems = DiscoItems;
