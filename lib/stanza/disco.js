"use strict";

var _ = require('underscore');
var stanza = require('jxt');
var JID = require('../jid');
var Iq = require('./iq');
var RSM = require('./rsm');
var DataForm = require('./dataforms').DataForm;


exports.DiscoInfo = stanza.define({
    name: 'discoInfo',
    namespace: 'http://jabber.org/protocol/disco#info',
    element: 'query',
    fields: {
        node: stanza.attribute('node'),
        identities: {
            get: function () {
                var result = [];
                var identities = stanza.find(this.xml, this._NS, 'identity');
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
            set: function (values) {
                var self = this;

                var existing = stanza.find(this.xml, this._NS, 'identity');
                existing.forEach(function (item) {
                    self.xml.removeChild(item);
                });
                values.forEach(function (value) {
                    var identity = document.createElementNS(self._NS, 'identity');
                    stanza.setAttribute(identity, 'category', value.category);
                    stanza.setAttribute(identity, 'type', value.type);
                    stanza.setAttribute(identity, 'name', value.name);
                    if (value.lang) {
                        identity.setAttributeNS(stanza.XML_NS, 'lang', value.lang);
                    }
                    self.xml.appendChild(identity);
                });
            }
        },
        features: {
            get: function () {
                var result = [];
                var features = stanza.find(this.xml, this._NS, 'feature');
                features.forEach(function (feature) {
                    result.push(feature.getAttribute('var'));
                });
                return result;
            },
            set: function (values) {
                var self = this;

                var existing = stanza.find(this.xml, this._NS, 'feature');
                existing.forEach(function (item) {
                    self.xml.removeChild(item);
                });
                values.forEach(function (value) {
                    var feature = document.createElementNS(self._NS, 'feature');
                    feature.setAttribute('var', value);
                    self.xml.appendChild(feature);
                });
            }
        }
    }
});


exports.DiscoItems = stanza.define({
    name: 'discoItems',
    namespace: 'http://jabber.org/protocol/disco#items',
    element: 'query',
    fields: {
        node: stanza.attribute('node'),
        items: {
            get: function () {
                var result = [];
                var items = stanza.find(this.xml, this._NS, 'item');
                items.forEach(function (item) {
                    result.push({
                        jid: new JID(stanza.getAttribute(item, 'jid')),
                        node: stanza.getAttribute(item, 'node'),
                        name: stanza.getAttribute(item, 'name')
                    });
                });
                return result;
            },
            set: function (values) {
                var self = this;
                var existing = stanza.find(this.xml, this._NS, 'item');

                existing.forEach(function (item) {
                    self.xml.removeChild(item);
                });
                values.forEach(function (value) {
                    var item = document.createElementNS(self._NS, 'item');
                    stanza.setAttribute(item, 'jid', value.jid.toString());
                    stanza.setAttribute(item, 'node', value.node);
                    stanza.setAttribute(item, 'name', value.name);
                    self.xml.appendChild(item);
                });
            }
        }
    }
});


stanza.extend(Iq, exports.DiscoInfo);
stanza.extend(Iq, exports.DiscoItems);
stanza.extend(exports.DiscoItems, RSM);
stanza.extend(exports.DiscoInfo, DataForm, 'extensions');
