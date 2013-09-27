var stanza = require('jxt');
var JID = require('../jid');
var XML_NS = 'http://www.w3.org/XML/1998/namespace';


exports.langAttribute = stanza.field(
    function (xml) {
        return xml.getAttributeNS(XML_NS, 'lang') || '';
    },
    function (xml, value) {
        xml.setAttributeNS(XML_NS, 'lang', value);
    }
);

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

exports.b64Text = stanza.field(
    function (xml) {
        if (xml.textContent && xml.textContent != '=') {
            return atob(xml.textContent);
        }
        return '';
    },
    function (xml, value) {
        xml.textContent = btoa(value) || '=';
    }
);

exports.dateAttribute = function (attr, now) {
    return {
        get: function () {
            var data = stanza.getAttribute(this.xml, attr);
            if (data) return new Date(data);
            if (now) return new Date(Date.now());
        },
        set: function (value) {
            if (!value) return;
            stanza.setAttribute(this.xml, attr, value.toISOString());
        }
    };
};

exports.dateSub = function (NS, sub, now) {
    return {
        get: function () {
            var data = stanza.getSubText(this.xml, NS, sub);
            if (data) return new Date(data);
            if (now) return new Date(Date.now());
        },
        set: function (value) {
            if (!value) return;
            stanza.setSubText(this.xml, NS, sub, value.toISOString());
        }
    };
};

exports.dateSubAttribute = function (NS, sub, attr, now) {
    return {
        get: function () {
            var data = stanza.getSubAttribute(this.xml, NS, sub, attr);
            if (data) return new Date(data);
            if (now) return new Date(Date.now());
        },
        set: function (value) {
            if (!value) return;
            stanza.setSubAttribute(this.xml, NS, sub, attr, value.toISOString());
        }
    };
};

exports.numberAttribute = stanza.field(
    function (xml, attr, defaultVal) {
        return parseInt(stanza.getAttribute(xml, attr, defaultVal), 10);
    },
    function (xml, attr, value) {
        stanza.setAttribute(xml, attr, value.toString());
    }
);

exports.numberSub = stanza.field(
    function (xml, NS, sub, defaultVal) {
        return parseInt(stanza.getSubText(xml, NS, sub, defaultVal), 10);
    },
    function (xml, NS, sub, value) {
        stanza.setSubText(xml, NS, sub, value.toString());
    }
);
