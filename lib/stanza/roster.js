var _ = require('lodash'),
    stanza = require('./stanza'),
    Iq = require('./iq').Iq;


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
    get ver () {
        return this.xml.getAttribute('ver') || '';
    },
    set ver (value) {
        if (value) {
            this.xml.setAttribute('ver', value);
        }
    },
    get items () {
        var self = this;

        var items = stanza.find(this.xml, this.NS, 'item');
        if (!items.length) {
            return [];
        }
        var results = [];
        _.each(items, function (item) {
            var data = {
                jid: item.getAttribute('jid') || undefined,
                _name: item.getAttribute('name') || undefined,
                subscription: item.getAttribute('subscription') || 'none',
                ask: item.getAttribute('ask') || undefined,
                groups: []
            };
            var groups = stanza.find(item, self.NS, 'group');
            _.each(groups, function (group) {
                data.groups.push(group.textContent);
            });
            results.push(data);
        });
        return results;
    },
    set items (values) {
        var self = this;
        _.each(values, function (value) {
            var item = document.createElementNS(self.NS, 'item');
            if (value.jid) { 
                item.setAttribute('jid', value.jid); 
            }
            if (value.name) { 
                item.setAttribute('name', value.name); 
            }
            if (value.subscription) { 
                item.setAttribute('subscription', value.subscription); 
            }
            if (value.ask) { 
                item.setAttribute('ask', value.ask); 
            }
            _.each(value.groups || [], function (name) {
                var group = document.createElementNS(self.NS, 'group');
                group.textContent = name;
                item.appendChild(group);
            });
            self.xml.appendChild(item);
        });
    }
};


stanza.extend(Iq, Roster);


exports.Roster = Roster;
