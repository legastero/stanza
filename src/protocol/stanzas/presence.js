import * as NS from '../namespaces';

const internals = {};

internals.definePresence = function(JXT, name, namespace) {
    const Utils = JXT.utils;

    JXT.define({
        element: 'presence',
        fields: {
            $status: {
                get: function() {
                    return Utils.getSubLangText(this.xml, namespace, 'status', this.lang);
                }
            },
            avatarId: {
                get: function() {
                    const update = Utils.find(this.xml, NS.VCARD_TEMP_UPDATE, 'x');

                    if (!update.length) {
                        return '';
                    }

                    return Utils.getSubText(update[0], NS.VCARD_TEMP_UPDATE, 'photo');
                },
                set: function(value) {
                    const update = Utils.findOrCreate(this.xml, NS.VCARD_TEMP_UPDATE, 'x');

                    if (value === '') {
                        Utils.setBoolSub(update, NS.VCARD_TEMP_UPDATE, 'photo', true);
                    } else if (value === true) {
                        return;
                    } else if (value) {
                        Utils.setSubText(update, NS.VCARD_TEMP_UPDATE, 'photo', value);
                    } else {
                        this.xml.removeChild(update);
                    }
                }
            },
            decloak: Utils.subAttribute(NS.DECLOAKING_0, 'decloak', 'reason'),
            from: Utils.jidAttribute('from', true),
            id: Utils.attribute('id'),
            idleSince: Utils.dateSubAttribute(NS.IDLE_1, 'idle', 'since'),
            lang: Utils.langAttribute(),
            priority: Utils.numberSub(namespace, 'priority', false, 0),
            show: Utils.textSub(namespace, 'show'),
            status: {
                get: function() {
                    const statuses = this.$status;
                    return statuses[this.lang] || '';
                },
                set: function(value) {
                    Utils.setSubLangText(this.xml, namespace, 'status', value, this.lang);
                }
            },
            to: Utils.jidAttribute('to', true),
            type: {
                get: function() {
                    return Utils.getAttribute(this.xml, 'type', 'available');
                },
                set: function(value) {
                    if (value === 'available') {
                        value = false;
                    }

                    Utils.setAttribute(this.xml, 'type', value);
                }
            }
        },
        name: name,
        namespace: namespace,
        topLevel: true
    });
};

export default function(JXT) {
    internals.definePresence(JXT, 'presence', NS.CLIENT);
    internals.definePresence(JXT, 'serverPresence', NS.SERVER);
    internals.definePresence(JXT, 'componentPresence', NS.COMPONENT);
}
