'use strict';

var stanza = require('jxt');
var JID = require('../jid');


exports.jidAttribute = stanza.field(
    function (xml, attr) {
        return new JID(stanza.getAttribute(xml, attr));
    },
    function (xml, attr, value) {
        stanza.setAttribute(xml, attr, (value || '').toString());
    }
);

exports.jidSub = stanza.field(
    function (xml, NS, sub) {
        return new JID(stanza.getSubText(xml, NS, sub));
    },
    function (xml, NS, sub, value) {
        stanza.setSubText(xml, NS, sub, (value || '').toString());
    }
);

exports.tzoSub = stanza.field(
    function (xml, NS, sub, defaultVal) {
        var split, hrs, min;
        var sign = -1;
        var formatted = stanza.getSubText(xml, NS, sub);

        if (!formatted) {
            return defaultVal;
        }

        if (formatted.charAt(0) === '-') {
            sign = 1;
            formatted = formatted.slice(1);
        }

        split = formatted.split(':');
        hrs = parseInt(split[0], 10);
        min = parseInt(split[1], 10);
        return (hrs * 60 + min) * sign;
    },
    function (xml, NS, sub, value) {
        var hrs, min;
        var formatted = '-';
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
        stanza.setSubText(xml, NS, sub, formatted);
    }
);

exports.enumSub = function (NS, enumValues) {
    return {
        get: function () {
            var self = this;
            var result = [];
            enumValues.forEach(function (enumVal) {
                var exists = stanza.find(self.xml, NS, enumVal);
                if (exists.length) {
                    result.push(exists[0].tagName);
                }
            });
            return result[0] || '';
        },
        set: function (value) {
            var self = this;
            enumValues.forEach(function (enumVal) {
                var exists = stanza.find(self.xml, NS, enumVal);
                if (exists.length) {
                    self.xml.removeChild(exists[0]);
                }
            });

            if (value) {
                var condition = stanza.createElement(NS, value);
                this.xml.appendChild(condition);
            }
        }
    };
};
