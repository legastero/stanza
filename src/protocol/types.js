import { JID } from './jid';

export default function(JXT) {
    const Utils = JXT.utils;

    Utils.jidAttribute = function(attr, prepped) {
        return {
            get: function() {
                const jid = new JID(Utils.getAttribute(this.xml, attr));
                if (prepped) {
                    jid.prepped = true;
                }
                return jid;
            },
            set: function(value) {
                Utils.setAttribute(this.xml, attr, (value || '').toString());
            }
        };
    };

    Utils.jidSub = function(NS, sub, prepped) {
        return {
            get: function() {
                const jid = new JID(Utils.getSubText(this.xml, NS, sub));
                if (prepped) {
                    jid.prepped = true;
                }
                return jid;
            },
            set: function(value) {
                Utils.setSubText(this.xml, NS, sub, (value || '').toString());
            }
        };
    };

    Utils.tzoSub = Utils.field(
        function(xml, NS, sub, defaultVal) {
            let sign = -1;
            let formatted = Utils.getSubText(xml, NS, sub);

            if (!formatted) {
                return defaultVal;
            }

            if (formatted.charAt(0) === '-') {
                sign = 1;
                formatted = formatted.slice(1);
            }

            const split = formatted.split(':');
            const hrs = parseInt(split[0], 10);
            const min = parseInt(split[1], 10);
            return (hrs * 60 + min) * sign;
        },
        function(xml, NS, sub, value) {
            let hrs;
            let min;
            let formatted = '-';
            if (typeof value === 'number') {
                if (value < 0) {
                    value = -value;
                    formatted = '+';
                }
                hrs = value / 60;
                min = value % 60;
                formatted += (hrs < 10 ? '0' : '') + hrs + ':' + (min < 10 ? '0' : '') + min;
            } else {
                formatted = value;
            }
            Utils.setSubText(xml, NS, sub, formatted);
        }
    );
}
