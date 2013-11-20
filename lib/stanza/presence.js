"use strict";

var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');


module.exports = stanza.define({
    name: 'presence',
    namespace: 'jabber:client',
    element: 'presence',
    topLevel: true,
    fields: {
        lang: stanza.langAttribute(),
        id: stanza.attribute('id'),
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from'),
        priority: stanza.subText('jabber:client', 'priority', '0'),
        show: stanza.subText('jabber:client', 'show'),
        type: {
            get: function () {
                return stanza.getAttribute(this.xml, 'type', 'available');
            },
            set: function (value) {
                if (value === 'available') {
                    value = false;
                }
                stanza.setAttribute(this.xml, 'type', value);
            }
        },
        $status: {
            get: function () {
                return stanza.getSubLangText(this.xml, this._NS, 'status', this.lang);
            }
        },
        status: {
            get: function () {
                var statuses = this.$status;
                return statuses[this.lang] || '';
            },
            set: function (value) {
                stanza.setSubLangText(this.xml, this._NS, 'status', value, this.lang);
            }
        },
        idleSince: stanza.dateSubAttribute('urn:xmpp:idle:1', 'idle', 'since'),
        decloak: stanza.subAttribute('urn:xmpp:decloak:0', 'decloak', 'reason')
    }
});
