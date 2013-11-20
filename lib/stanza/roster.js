"use strict";

var _ = require('underscore');
var stanza = require('jxt');
var Iq = require('./iq');
var JID = require('../jid');


var Roster = module.exports = stanza.define({
    name: 'roster',
    namespace: 'jabber:iq:roster',
    element: 'query',
    fields: {
        ver: {
            get: function () {
                return stanza.getAttribute(this.xml, 'ver');
            },
            set: function (value) {
                var force = (value === '');
                stanza.setAttribute(this.xml, 'ver', value, force);
            }
        },
        items: {
            get: function () {
                var self = this;

                var items = stanza.find(this.xml, this._NS, 'item');
                if (!items.length) {
                    return [];
                }
                var results = [];
                items.forEach(function (item) {
                    var data = {
                        jid: new JID(stanza.getAttribute(item, 'jid', '')),
                        name: stanza.getAttribute(item, 'name', undefined),
                        subscription: stanza.getAttribute(item, 'subscription', 'none'),
                        ask: stanza.getAttribute(item, 'ask', undefined),
                        groups: []
                    };
                    var groups = stanza.find(item, self._NS, 'group');
                    groups.forEach(function (group) {
                        data.groups.push(group.textContent);
                    });
                    results.push(data);
                });
                return results;
            },
            set: function (values) {
                var self = this;
                values.forEach(function (value) {
                    var item = document.createElementNS(self._NS, 'item');
                    stanza.setAttribute(item, 'jid', value.jid.toString());
                    stanza.setAttribute(item, 'name', value.name);
                    stanza.setAttribute(item, 'subscription', value.subscription);
                    stanza.setAttribute(item, 'ask', value.ask);
                    (value.groups || []).forEach(function (name) {
                        var group = document.createElementNS(self._NS, 'group');
                        group.textContent = name;
                        item.appendChild(group);
                    });
                    self.xml.appendChild(item);
                });
            }
        }
    }
});

stanza.extend(Iq, Roster);
