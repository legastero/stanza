'use strict';


module.exports = function (stanza) {
    var types = stanza.utils;

    stanza.define({
        name: 'presence',
        namespace: 'jabber:client',
        element: 'presence',
        topLevel: true,
        fields: {
            lang: types.langAttribute(),
            id: types.attribute('id'),
            to: types.jidAttribute('to', true),
            from: types.jidAttribute('from', true),
            priority: types.numberSub('jabber:client', 'priority', false, 0),
            show: types.textSub('jabber:client', 'show'),
            type: {
                get: function () {
                    return types.getAttribute(this.xml, 'type', 'available');
                },
                set: function (value) {
                    if (value === 'available') {
                        value = false;
                    }
                    types.setAttribute(this.xml, 'type', value);
                }
            },
            $status: {
                get: function () {
                    return types.getSubLangText(this.xml, this._NS, 'status', this.lang);
                }
            },
            status: {
                get: function () {
                    var statuses = this.$status;
                    return statuses[this.lang] || '';
                },
                set: function (value) {
                    types.setSubLangText(this.xml, this._NS, 'status', value, this.lang);
                }
            },
            idleSince: types.dateSubAttribute('urn:xmpp:idle:1', 'idle', 'since'),
            decloak: types.subAttribute('urn:xmpp:decloak:0', 'decloak', 'reason'),
            avatarId: {
                get: function () {
                    var NS = 'vcard-temp:x:update';
                    var update = types.find(this.xml, NS, 'x');
                    if (!update.length) {
                        return '';
                    }
                    return types.getSubText(update[0], NS, 'photo');
                },
                set: function (value) {
                    var NS = 'vcard-temp:x:update';
                    var update = types.findOrCreate(this.xml, NS, 'x');
    
                    if (value === '') {
                        types.setBoolSub(update, NS, 'photo', true);
                    } else if (value === true) {
                        return;
                    } else if (value) {
                        types.setSubText(update, NS, 'photo', value);
                    } else {
                        this.xml.removeChild(update);
                    }
                }
            }
        }
    });
};
