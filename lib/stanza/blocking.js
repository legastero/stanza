'use strict';

var JID = require('xmpp-jid').JID;

var NS = 'urn:xmpp:blocking';


module.exports = function (stanza) {
    var types = stanza.utils;

    var jids = {
        get: function () {
            var result = [];
            var items = types.find(this.xml, NS, 'item');
            if (!items.length) {
                return result;
            }
    
            items.forEach(function (item) {
                result.push(new JID(types.getAttribute(item, 'jid', '')));
            });
    
            return result;
        },
        set: function (values) {
            var self = this;
            values.forEach(function (value) {
                var item = types.createElement(NS, 'item', NS);
                types.setAttribute(item, 'jid', value.toString());
                self.xml.appendChild(item);
            });
        }
    };
    
    var Block = stanza.define({
        name: 'block',
        namespace: NS,
        element: 'block',
        fields: {
            jids: jids
        }
    });
    
    var Unblock = stanza.define({
        name: 'unblock',
        namespace: NS,
        element: 'unblock',
        fields: {
            jids: jids
        }
    });
    
    var BlockList = stanza.define({
        name: 'blockList',
        namespace: NS,
        element: 'blocklist',
        fields: {
            jids: jids
        }
    });
    
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Block);
        stanza.extend(Iq, Unblock);
        stanza.extend(Iq, BlockList);
    });
};
