'use strict';

var _ = require('underscore');
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

exports.subExtension = function (name, NS, sub, ChildJXT) {
    return {
        get: function () {
            if (!this._extensions[name]) {
                var wrapper = stanza.find(this.xml, NS, sub);
                if (!wrapper.length) {
                    wrapper= stanza.createElement(NS, sub, this._NS);
                    this.xml.appendChild(wrapper);
                } else {
                    wrapper = wrapper[0];
                }

                var existing = stanza.find(wrapper, ChildJXT.prototype._NS, ChildJXT.prototype._EL);
                if (!existing.length) {
                    this._extensions[name] = new ChildJXT({}, null, {xml: wrapper});
                    wrapper.appendChild(this._extensions[name].xml);
                } else {
                    this._extensions[name] = new ChildJXT(null, existing[0], {xml: wrapper});
                }
                this._extensions[name].parent = this;
            }
            return this._extensions[name];
        },
        set: function (value) {
            var wrapper = stanza.find(this.xml, NS, sub);
            if (wrapper.length && !value) {
                this.xml.removeChild(wrapper[0]);
            }

            if (value) {
                var child = this[name];
                if (value === true) {
                    value = {};
                }
                _.extend(child, value);
            }
        }
    };
};

exports.subMultiExtension = function (NS, sub, ChildJXT) {
    return {
        get: function () {
            var self = this;
            var results = [];
            var existing = stanza.find(this.xml, NS, sub);
            if (!existing.length) {
                return results;
            }
            existing = existing[0];
            var data = stanza.find(existing, ChildJXT.prototype._NS, ChildJXT.prototype._EL);

            data.forEach(function (xml) {
                results.push(new ChildJXT({}, xml, self));
            });
            return results;
        },
        set: function (values) {
            var self = this;
            var existing = stanza.find(this.xml, NS, sub);
            if (existing.length) {
                self.xml.removeChild(existing[0]);
            }

            if (!values.length) {
                return;
            }

            existing = stanza.createElement(NS, sub, this._NS);

            values.forEach(function (value) {
                var content = new ChildJXT(value, null, self);
                existing.appendChild(content.xml);
            });

            self.xml.appendChild(existing);
        }
    };
};
