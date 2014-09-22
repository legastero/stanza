'use strict';

var _ = require('underscore');
var NS = 'urn:xmpp:reach:0';


module.exports = function (stanza) {
    var types = stanza.utils;

    var ReachURI = stanza.define({
        name: '_reachAddr',
        namespace: NS,
        element: 'addr',
        fields: {
            uri: types.attribute('uri'),
            $desc: {
                get: function () {
                    return types.getSubLangText(this.xml, NS, 'desc', this.lang);
                }
            },
            desc: {
                get: function () {
                    var descs = this.$desc;
                    return descs[this.lang] || '';
                },
                set: function (value) {
                    types.setSubLangText(this.xml, NS, 'desc', value, this.lang);
                }
            }
        }
    });
    
    var reachability = {
        get: function () {
            var reach = types.find(this.xml, NS, 'reach');
            var results = [];
            if (reach.length) {
                var addrs = types.find(reach[0], NS, 'addr');
                _.forEach(addrs, function (addr) {
                    results.push(new ReachURI({}, addr));
                });
            }
            return results;
        },
        set: function (value) {
            var reach = types.findOrCreate(this.xml, NS, 'reach');
            types.setAttribute(reach, 'xmlns', NS);
            _.forEach(value, function (info) {
                var addr = new ReachURI(info);
                reach.appendChild(addr.xml);
            });
        }
    };
    
    
    stanza.withPubsubItem(function (Item) {
        stanza.add(Item, 'reach', reachability);
    });

    stanza.withPresence(function (Presence) {
        stanza.add(Presence, 'reach', reachability);
    });
};
