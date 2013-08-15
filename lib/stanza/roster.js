var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Iq = require('./iq');


function Roster(data, xml) {
    return stanza.init(this, xml, data);
}
Roster.prototype = {
    constructor: {
        value: Roster
    },
    _name: 'roster',
    NS: 'jabber:iq:roster',
    EL: 'query',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get ver() {
        return stanza.getAttribute(this.xml, 'ver');
    },
    set ver(value) {
        var force = (value === '');
        stanza.setAttribute(this.xml, 'ver', value, force);
    },
    get items() {
        var self = this;

        var items = stanza.find(this.xml, this.NS, 'item');
        if (!items.length) {
            return [];
        }
        var results = [];
        items.forEach(function (item) {
            var data = {
                jid: stanza.getAttribute(item, 'jid', undefined),
                name: stanza.getAttribute(item, 'name', undefined),
                subscription: stanza.getAttribute(item, 'subscription', 'none'),
                ask: stanza.getAttribute(item, 'ask', undefined),
                groups: []
            };
            var groups = stanza.find(item, self.NS, 'group');
            groups.forEach(function (group) {
                data.groups.push(group.textContent);
            });
            results.push(data);
        });
        return results;
    },
    set items(values) {
        var self = this;
        values.forEach(function (value) {
            var item = document.createElementNS(self.NS, 'item');
            stanza.setAttribute(item, 'jid', value.jid);
            stanza.setAttribute(item, 'name', value.name);
            stanza.setAttribute(item, 'subscription', value.subscription);
            stanza.setAttribute(item, 'ask', value.ask);
            (value.groups || []).forEach(function (name) {
                var group = document.createElementNS(self.NS, 'group');
                group.textContent = name;
                item.appendChild(group);
            });
            self.xml.appendChild(item);
        });
    }
};


stanza.extend(Iq, Roster);


module.exports = Roster;
