"use strict";

var stanza = require('jxt');
var util = require('./util');
var Iq = require('./iq');
var JID = require('../jid');

var NS = 'urn:xmpp:blocking';


var jids = {
    get: function () {
        var result = [];
        var items = stanza.find(this.xml, NS, 'item');
        if (!items.length) return result;

        items.forEach(function (item) {
            result.push(new JID(stanza.getAttribute(item, 'jid', '')));
        });

        return result;
    },
    set: function (values) {
        var self = this;
        values.forEach(function (value) {
            var item = stanza.createElement(NS, 'item', NS);
            stanza.setAttribute(item, 'jid', value.toString());
            self.xml.appendChild(item);
        });
    }
};

exports.Block = stanza.define({
    name: 'block',
    namespace: NS,
    element: 'block',
    fields: {
        jids: jids
    }
});

exports.Unblock = stanza.define({
    name: 'unblock',
    namespace: NS,
    element: 'unblock',
    fields: {
        jids: jids
    }
});

exports.BlockList = stanza.define({
    name: 'blockList',
    namespace: NS,
    element: 'blocklist',
    fields: {
        jids: jids
    }
});


stanza.extend(Iq, exports.Block);
stanza.extend(Iq, exports.Unblock);
stanza.extend(Iq, exports.BlockList);
