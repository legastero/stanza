"use strict";

var _ = require('underscore');
var stanza = require('jxt');
var Item = require('./pubsub').Item;
var EventItem = require('./pubsub').EventItem;
var Presence = require('./presence');


var NS = 'urn:xmpp:reach:0';


var ReachURI = module.exports = stanza.define({
    name: '_reachAddr',
    namespace: NS,
    element: 'addr',
    fields: {
        uri: stanza.attribute('uri'),
        $desc: {
            get: function () {
                return stanza.getSubLangText(this.xml, NS, 'desc', this.lang);
            }
        },
        desc: {
            get: function () {
                var descs = this.$desc;
                return descs[this.lang] || '';
            },
            set: function (value) {
                stanza.setSubLangText(this.xml, NS, 'desc', value, this.lang);
            }
        }
    }
});


var reachability = {
    get: function () {
        var reach = stanza.find(this.xml, NS, 'reach');
        var results = [];
        if (reach.length) {
            var addrs = stanza.find(reach[0], NS, 'addr');
            _.forEach(addrs, function (addr) {
                results.push(new ReachURI({}, addr));
            });
        }
        return results;
    },
    set: function (value) {
        var reach = stanza.findOrCreate(this.xml, NS, 'reach');
        stanza.setAttribute(reach, 'xmlns', NS);
        _.forEach(value, function (info) {
            var addr = new ReachURI(info);
            reach.appendChild(addr.xml);
        });
    }
};


stanza.add(Item, 'reach', reachability);
stanza.add(EventItem, 'reach', reachability);
stanza.add(Presence, 'reach', reachability);
